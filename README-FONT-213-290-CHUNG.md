# Web v61.13: Cài Font Chung CE 2.13 Và CE 2.9

## Thiết Bị Hỗ Trợ

- CE 2.13 v20.3–v20.7: model 2, profile `0x21`, mã firmware 127–131.
  Bao gồm CE v20.7 BOOT NO FONT TEST đã gửi trước đó.
- CE 2.9 v19.0 VN TODO ALBUM TEST: model 2, profile `0x29`, mã firmware 133.

Web tự nhận dạng sau khi kết nối. Không cần chọn bộ font 2.13 hay 2.9.
Hai bộ font đều có 11.978 byte, 230 ký tự ở mỗi cỡ;
font 2.9 rút ngắn hai đầu dấu trên chữ ă cỡ lớn, font 2.13 giữ nguyên,
đủ chữ tiếng Việt có dấu cả chữ hoa và chữ thường. Phần xem trước và giới
hạn độ dài nội dung vẫn theo đúng kích thước từng màn.

## Cài Font

1. Giải nén ZIP web. Dùng các file bên trong cùng một thư mục như đã đóng gói.
2. Kết nối đúng đồng hồ, vào Cập nhật phần mềm, bấm Cài dữ liệu tiếng Việt.
3. Web sẽ sao lưu flash ngoài 512 KB trước khi ghi. Lưu file sao lưu của đúng
   thiết bị; không dùng bản sao lưu từ đồng hồ khác.
4. Giữ nguồn, kết nối BLE và trang mở đến khi web xác nhận dữ liệu đã sẵn sàng.
5. Nếu đã có đúng font, web không cài lại. Có thể dùng Việc cần làm và Đếm ngược.

`default-font.bin` là font cho flash ngoài, không phải firmware OTA. Bộ font
đã tích hợp trong web; không cần chọn thủ công file ZIP bộ font riêng.

## GitHub Pages

Đưa toàn bộ nội dung thư mục `web` lên nơi chứa `index.html`, không chỉ thay
mỗi `index.html`. Giữ các file JavaScript và dữ liệu font cạnh nhau. Không
đưa thư mục `tests`, firmware, mã nguồn firmware hoặc bản sao lưu flash lên web.
Sau khi cập nhật, tải lại trang không dùng cache trước khi kết nối.

## Phạm Vi

Bản này dựa trên web chung v61.12, giữ nguyên phạm vi thiết bị.
Tách font 2.9 để sửa dấu trên chữ ă; tự chọn theo mã nhận dạng khi kết nối.
Xem README-FONT-290-BREVE.md.
Thêm nút hủy phiên cài lỗi bằng lệnh firmware đã hỗ trợ, kiểm tra lại trạng
thái trước khi cài lại. Bỏ nút sao lưu thủ công và mục nhập bản sao lưu;
giữ sao lưu tự động trước khi ghi. Xem README-FONT-RETRY.md.
Không thay đổi firmware, LUT, BLE, OTA, hẹn giờ, tải ảnh, album hay các
nhánh dành cho màn khác.
Không mở chức năng cài font này cho firmware cũ, no CE chưa xác nhận giao thức,
7.5, DA14585 hoặc thiết bị không đúng profile/version. Các chức năng cũ của
những thiết bị đó giữ nguyên, nhưng không có nghĩa tất cả đều cài được bộ font này.

Đã kiểm thử trình duyệt với BLE/flash giả lập cho cả hai profile, cài và đọc
lại đủ font, chặn thiết bị sai, tránh cài lặp, xem trước desktop/mobile.
Chưa thử trực tiếp BLE và flash trên đồng hồ thật.
