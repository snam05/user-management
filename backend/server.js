import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

const app = express();
const PORT = 4409;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://20235388:20235388@20235388.8hmdxgq.mongodb.net/it4409';
const MAX_LIMIT = 100;

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên không được để trống'],
        minlength: [2, 'Tên phải có ít nhất 2 ký tự'],
    },
    age: {
        type: Number,
        required: [true, 'Tuổi không được để trống'],
        min: [0, 'Tuổi phải >= 0'],
        validate: {
            validator: Number.isInteger,
            message: 'Tuổi phải là số nguyên'
        }
    },
    email: {
        type: String,
        required: [true, 'Email không được để trống'],
        trim: true,
        lowercase: true,
        unique: true,
        match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'],
    },
    address: {
        type: String,
        trim: true
    }
});

UserSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model('User', UserSchema, 'users');

app.use(cors());
app.use(express.json());

const parseBoundedInteger = (value, fallback, min, max) => {
    const parsedValue = Number.parseInt(value, 10);

    if (!Number.isFinite(parsedValue)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, parsedValue));
};

const normalizeText = (value) => {
    if (typeof value !== 'string') {
        return value;
    }

    return value.trim();
};

const normalizeEmail = (value) => {
    if (typeof value !== 'string') {
        return value;
    }

    return value.trim().toLowerCase();
};

const buildUserPayload = (body, { partial = false } = {}) => {
    const payload = {};
    const hasKey = (key) => Object.prototype.hasOwnProperty.call(body, key);

    if (!partial || hasKey('name')) {
        const name = normalizeText(body.name);
        if (name !== undefined && name !== '') {
            payload.name = name;
        }
    }

    if (!partial || hasKey('age')) {
        if (body.age !== undefined && body.age !== null && body.age !== '') {
            const age = Number(body.age);

            if (!Number.isInteger(age)) {
                throw new Error('Tuổi phải là số nguyên');
            }

            payload.age = age;
        }
    }

    if (!partial || hasKey('email')) {
        const email = normalizeEmail(body.email);
        if (email !== undefined && email !== '') {
            payload.email = email;
        }
    }

    if (!partial || hasKey('address')) {
        const address = normalizeText(body.address);
        if (address !== undefined && address !== '') {
            payload.address = address;
        }
    }

    return payload;
};

app.get('/api/users', async (req, res) => {
    try {
        const page = parseBoundedInteger(req.query.page, 1, 1, Number.MAX_SAFE_INTEGER);
        const limit = parseBoundedInteger(req.query.limit, 5, 1, MAX_LIMIT);
        const search = (req.query.search || '').trim();

        const filter = {};

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            filter.$or = [
                { name: searchRegex },
                { email: searchRegex },
                { address: searchRegex }
            ];
        }

        const [total, data] = await Promise.all([
            User.countDocuments(filter),
            User.find(filter)
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ _id: 1 })
        ]);

        const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

        return res.status(200).json({
            page,
            limit,
            total,
            totalPages,
            data
        });
    } catch (err) {
        return res.status(500).json({
            error: 'Lỗi khi lấy danh sách người dùng'
        });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const payload = buildUserPayload(req.body);
        const user = await User.create(payload);
        return res.status(201).json({
            message: 'Tạo người dùng thành công',
            data: user
        });
    } catch (err) {
        if (err?.code === 11000) {
            return res.status(400).json({
                error: 'Email đã tồn tại'
            });
        }

        if (err?.message === 'Tuổi phải là số nguyên') {
            return res.status(400).json({
                error: err.message
            });
        }

        if (err?.name === 'ValidationError' || err?.name === 'CastError') {
            return res.status(400).json({
                error: err.message
            });
        }

        return res.status(500).json({
            error: 'Lỗi khi tạo người dùng'
        });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                error: 'Không tìm thấy người dùng'
            });
        }

        const payload = buildUserPayload(req.body, { partial: true });

        if (Object.keys(payload).length === 0) {
            return res.status(400).json({
                error: 'Không có dữ liệu hợp lệ để cập nhật'
            });
        }

        const updatedUser = await User.findByIdAndUpdate(id, payload, {
            new: true,
            runValidators: true
        });

        if (!updatedUser) {
            return res.status(404).json({
                error: 'Không tìm thấy người dùng'
            });
        }

        return res.status(200).json({
            message: 'Cập nhật người dùng thành công',
            data: updatedUser
        });
    } catch (err) {
        if (err?.code === 11000) {
            return res.status(400).json({
                error: 'Email đã tồn tại'
            });
        }

        if (err?.message === 'Tuổi phải là số nguyên') {
            return res.status(400).json({
                error: err.message
            });
        }

        if (err?.name === 'ValidationError' || err?.name === 'CastError') {
            return res.status(400).json({
                error: err.message
            });
        }

        return res.status(500).json({
            error: 'Lỗi khi cập nhật người dùng'
        });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                error: 'Không tìm thấy người dùng'
            });
        }

        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({
                error: 'Không tìm thấy người dùng'
            });
        }

        return res.status(200).json({
            message: 'Xóa người dùng thành công'
        });
    } catch (err) {
        return res.status(500).json({
            error: 'Lỗi khi xóa người dùng'
        });
    }
});

mongoose.connect(MONGODB_URI).then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    })
}).catch((err) => {
    if (err?.code === 8000) {
        console.error('MongoDB authentication failed. Check username/password in MONGODB_URI and Atlas DB user settings.');
    }
    else {
        console.error('Error connecting to MongoDB:', err);
    }
})

