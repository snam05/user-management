# Giai thich 4 endpoint trong User Management Backend

Tai lieu nay mo ta backend dang xu ly gi theo tung buoc cho 4 API:
- GET /api/users
- POST /api/users
- PUT /api/users/:id
- DELETE /api/users/:id

## 1) GET /api/users
Muc tieu: lay danh sach user, ho tro phan trang va tim kiem.

Cac buoc xu ly:
1. Doc query tu request:
   - page: mac dinh 1, ep kieu so nguyen, nho hon 1 thi dua ve 1.
   - limit: mac dinh 5, ep kieu so nguyen, nho hon 1 thi dua ve 1.
   - search: chuoi tim kiem (co the rong).
2. Tao bien filter ban dau la object rong.
3. Neu co search:
   - Tao RegExp voi co i (khong phan biet hoa thuong).
   - Gan filter.$or de tim tren 3 truong: name, email, address.
4. Dem tong so ban ghi phu hop filter bang countDocuments(filter).
5. Tinh tong so trang:
   - totalPages = ceil(total / limit).
   - Neu total = 0 thi totalPages = 0.
6. Lay du lieu:
   - find(filter)
   - skip((page - 1) * limit)
   - limit(limit)
   - sort({ _id: -1 }) de ban ghi moi len truoc.
7. Tra ve 200 voi JSON:
   - page, limit, total, totalPages, data.
8. Neu co loi he thong thi tra 500 voi thong bao loi lay danh sach.

## 2) POST /api/users
Muc tieu: tao user moi.

Cac buoc xu ly:
1. Nhan body JSON tu client (name, age, email, address).
2. Goi User.create(req.body).
3. Mongoose tu dong validate theo UserSchema:
   - name bat buoc, toi thieu 2 ky tu.
   - age bat buoc, >= 0.
   - email bat buoc, dung dinh dang regex.
4. Neu tao thanh cong:
   - Tra 201.
   - JSON gom message va data la user vua tao.
5. Neu loi ValidationError hoac CastError:
   - Tra 400.
   - error = err.message.
6. Neu loi khac:
   - Tra 500 voi thong bao loi tao user.

## 3) PUT /api/users/:id
Muc tieu: cap nhat thong tin user theo id.

Cac buoc xu ly:
1. Lay id tu req.params.
2. Kiem tra id hop le bang mongoose.Types.ObjectId.isValid(id):
   - Neu khong hop le, tra 404 "Khong tim thay nguoi dung".
3. Goi findByIdAndUpdate(id, req.body, { new: true, runValidators: true }).
   - new: true => tra ve tai lieu sau cap nhat.
   - runValidators: true => validate du lieu update theo schema.
4. Neu ket qua null (khong ton tai user):
   - Tra 404 "Khong tim thay nguoi dung".
5. Neu thanh cong:
   - Tra 200.
   - JSON gom message va data la user da cap nhat.
6. Neu loi ValidationError hoac CastError:
   - Tra 400 voi err.message.
7. Neu loi khac:
   - Tra 500 voi thong bao loi cap nhat user.

## 4) DELETE /api/users/:id
Muc tieu: xoa user theo id.

Cac buoc xu ly:
1. Lay id tu req.params.
2. Kiem tra id hop le:
   - Neu khong hop le, tra 404 "Khong tim thay nguoi dung".
3. Goi findByIdAndDelete(id).
4. Neu ket qua null (khong co user de xoa):
   - Tra 404 "Khong tim thay nguoi dung".
5. Neu xoa thanh cong:
   - Tra 200 voi message "Xoa nguoi dung thanh cong".
6. Neu loi he thong:
   - Tra 500 voi thong bao loi xoa user.

## Tong ket luong xu ly chung
1. Request vao endpoint.
2. Validate thong tin dau vao (query, params, body) theo ngu canh.
3. Truy van MongoDB qua Mongoose model User.
4. Tra response dung ma trang thai HTTP:
   - 200/201 khi thanh cong.
   - 400 khi du lieu dau vao sai dinh dang/hong validate.
   - 404 khi khong tim thay tai nguyen.
   - 500 khi loi he thong.
