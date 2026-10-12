# Nhật ký chơi thử

> Theo bước chơi thử và đánh bóng trong `web_game_ai_skills_guide.md`: chạy game trong trình duyệt thật, chụp ảnh, đọc lỗi console, sửa rồi chạy lại.
> Các vòng chạy bằng kịch bản Playwright (Chromium) trên dev server có mock API và trên bản build production. Cỡ màn hình: desktop 1440×900, mobile 375×812 có cảm ứng; checklist UI thêm 768 và 1024 px.
> Lỗi nào kiểm tự động được thì được giữ lại thành test (cột "Giữ bằng"), để không quay lại.

## Vòng 1 · Từng game khi làm gameplay

Mỗi game được chơi qua kịch bản chụp ảnh từng bước trên desktop và mobile, rồi xem ảnh bằng mắt.

| Game | Vấn đề | Cách sửa |
|---|---|---|
| Một nét vẽ | Chạm tiếp khi đã bị kẹt làm thông báo "Bị kẹt" hiện lặp lại | Chạm thêm chỉ làm đỉnh rung nhẹ |
| Một nét vẽ | Dòng sông của màn Bảy cây cầu vẽ tràn khỏi bàn chơi sang panel | Cắt phần tràn của bàn chơi |
| Một nét vẽ | Dòng sông trông giống một con đường | Bỏ nét đứt, thêm sóng và màu bờ sông |
| Mọi game | Nút trên hộp kết quả nằm dưới mép màn hình mobile | Đưa nút lên thẻ đầu của hộp kết quả |
| Thành phố bùn | Trang bị treo: trang trí được rải khi bàn chơi chưa đo được kích thước (bằng 0) | Chỉ rải khi đã đo xong, giới hạn 4000 ô lưới |
| Thành phố bùn | Đường thẳng đứng A–B có hộp bao rộng 0 nên không chạm được | Vùng chạm là một hình chữ nhật trong suốt dọc theo đường |
| Thành phố bùn | Chạm vào nhà lại lát nhầm con đường nằm sau nhà | Nhà chặn chạm |
| Thành phố bùn | Màn có đường khóa sẵn không hiện số nhóm nhà | Hiện số nhóm ngay khi có ít nhất một đường được lát |
| Thành phố bùn | Nhà, người dân, bụi cây quá nhỏ trên bản đồ | Phóng to; trang trí dày dần theo khoảng cách tới đường |
| Thành phố bùn | Thanh dưới của chế độ phát lại bị đè chữ trên mobile | Nhãn ngắn lại thành "Về kết quả"; ẩn số bước dưới 480 px |
| Greedy | Thẻ phản hồi nằm khuất dưới bottom sheet trên mobile | Đưa thẻ phản hồi và gợi ý lên ngay sau câu hỏi; thu gọn ô số liệu, ẩn chú thích trên màn hẹp |
| Greedy | Câu "kề 8, 3, 6 đã dùng màu 1, 2, 3" dễ đọc thành ghép cặp theo vị trí | Ghi màu riêng cho từng đỉnh kề, sắp theo chỉ số: "các đỉnh kề … đã chiếm hết màu 1 đến k" |
| Greedy | Gợi ý mức 2 tô {1, 2}, hai đỉnh vốn đã đứng đầu thứ tự mặc định | Tính gợi ý trên thứ tự hiện tại; nhóm lớn được gợi ý trước |
| Greedy | Huy hiệu số màu trong thẻ "Vì sao?" đè lên nhau | Tăng bán kính đỉnh của hình minh họa |
| Dịch ma trận | Gợi ý mức 2 tính sai danh sách cạnh cần có | Sửa cách lấy tập cạnh đích |

## Vòng 2 · Tự chơi hết 45 màn (e2e)

Bộ e2e tự giải mọi màn bằng thao tác thật trên cả desktop và mobile, đồng thời bắt lỗi console, lỗi trang và HTTP ≥ 400.

| Vấn đề | Cách sửa | Giữ bằng |
|---|---|---|
| Mobile, màn ch7-l06: ảnh ngôi nhà che kín con đường ngắn G–I, không chạm được | Thẻ giá vẽ trên nhà, đặt ở phần đường còn nhìn thấy, và chạm vào thẻ giá cũng lát được đường | `levels.spec.ts` (bộ giải chạm vào thẻ giá) |
| ch7-l02: thẻ giá đè nhau ở chỗ hai đường cắt nhau (D–E, C–F) | Đặt thẻ có tránh va chạm: chừa khoảng hở, tránh điểm cắt | `labelClashes` trong `app.spec.ts` |
| ch7-l05 trên mobile: thẻ giá chạm vào chữ tên nhà | Thêm lượt đặt thứ hai trong đoạn 20–80% của đường, cho phép thẻ nằm trên hình nhà | `labelClashes` |
| Mock API mất cập nhật khi nhiều request đến cùng lúc (e2e chạy 8 worker) | Đọc, sửa, ghi liền một mạch, không có `await` xen giữa | `levels.spec.ts` (kiểm "+N điểm thưởng · tổng N điểm") |
| Selector của test bố cục bắt nhầm icon SVG trong bàn chơi | Đo đúng phần tử `.lg-board__svg` | – |

## Vòng 3 · Checklist UI mục 7.5 ở 375, 768, 1024, 1440 px

`tests/e2e/checklist.ts` đo trên mọi màn hình và mọi màn chơi: vùng chạm (44 px và cách nhau 8 px với cảm ứng, 24 px với chuột), con trỏ dạng tay, tương phản chữ HTML (4.5:1, chữ lớn 3:1) và tràn ngang.

| Vấn đề | Cách sửa |
|---|---|
| Vùng chạm dưới 44 px trên màn cảm ứng: nút gợi ý, nút thu gọn bottom sheet, nút "Đua với máy" trên thẻ màn, lựa chọn trong Cài đặt, nút cỡ nhỏ, chip đỉnh, dòng bảng nhãn Dijkstra | Cao tối thiểu 44 px khi con trỏ là cảm ứng |
| Các vùng chạm cách nhau dưới 8 px: nhóm nút trên thanh tiêu đề, lựa chọn trong Cài đặt | Khoảng cách 8 px |
| Ô "0" trong ma trận tương phản thấp | Đổi sang màu `#475569` |
| Ô ma trận 44 px tràn khỏi bottom sheet ở 375 px, mất hàng thứ 5 | Bottom sheet cao 56dvh ở màn điền ma trận |
| ch6-l05: vùng chạm của đỉnh A và L chỉ cách nhau 7.4 px ở 375 px | Dời đỉnh A |
| Lượt đo đầu báo nhầm các nút nằm sau hộp thoại giới thiệu | Khi có hộp thoại, chỉ đo phần bên trong hộp thoại |

Lượt cuối sạch ở cả 4 cỡ. Giữ bằng test "Bố cục và checklist UI (mục 7.5)" trong `app.spec.ts`.

## Vòng 4 · Nhúng vào trang chủ

Chạy trên trang chủ giả lập `tests/e2e/embed-host.html`: header 56 px, `hashRouting: false`, có token. Trang này có thể bật CSS toàn cục kiểu Bootstrap reboot + Tailwind preflight.

| Vấn đề | Cách sửa | Giữ bằng |
|---|---|---|
| Bản nhúng build ở chế độ thư viện có CSS 472 kB, vì mọi font bị nhúng vào dạng base64 | Build ở chế độ ứng dụng, font thành file riêng: CSS còn 58 kB (gzip 11 kB) | test bản build trong `embed.spec.ts` (kiểm đủ 3 font) |
| CSS toàn cục làm lệch giao diện: tiêu đề đổi màu và cỡ, `svg`/`img`/`canvas` thành `display: block` (icon trong nút rớt dòng), `label` thành `inline-block`, ảnh bị giới hạn `max-width: 100%` | Luật `:where()` trong `base.css` trả các thuộc tính đó về mặc định trong `.lg-root`; độ ưu tiên chỉ bằng một class | `embed.spec.ts`: 14 màn hình, 0 khác biệt |
| Request tới API chưa mang token của trang chủ | `authToken` gắn vào mọi request (điểm, tiến độ, analytics, gợi ý), trừ `sendBeacon` | `embed.spec.ts`, `services.test.ts` |
| Đổi máy thì màn đã qua bị khóa lại, dù server đã ghi sao | Đọc `GET /progress` lúc mở game, gộp theo giá trị lớn nhất | `flows.spec.ts` "Đổi máy", `services.test.ts` |

Lượt so style đầu tiên nhiễu vì hai lý do: font chưa tải xong làm đơn vị `ch` đổi, và một số giá trị bị đo giữa lúc chuyển động. Test được sửa để đo lại tới khi hai lần liên tiếp giống nhau.

## Vòng 5 · Hiệu năng và đổi kích thước (bản build production)

Đo bằng `requestAnimationFrame` trong lúc chơi (chạm lần lượt các đường) và 4 giây sau khi thắng (người dân đi dạo, pháo giấy, hộp kết quả). Dùng hai màn Thành phố bùn nhiều hiệu ứng nhất là ch7-l06 và ch7-l01, có trace Chrome để tìm tác vụ dài. CPU chậm là giả lập bằng DevTools.

Kết quả lượt đo cuối (sau mọi sửa đổi bên dưới):

| Cấu hình | Lúc chơi | Lúc thắng | Khung tệ nhất lúc thắng |
|---|---|---|---|
| Desktop 1440×900, CPU thật | 60 fps | 60 fps | 16.8 ms, không khung nào quá 50 ms |
| Mobile 375 px, CPU chậm 4× | 55–56 fps | 49–52 fps | 150–167 ms |
| Mobile 375 px, CPU chậm 6× | 44–47 fps | 35–38 fps | 283–300 ms |

Không có lỗi console, lỗi trang hay HTTP ≥ 400 trong lúc đo.

| Vấn đề | Cách sửa |
|---|---|
| Hộp kết quả và hình minh họa "Vì sao?" dựng trong cùng một khung: khung tệ nhất 333–383 ms ở CPU 4× | Hình minh họa vẽ trễ 2 khung hình (khung có chiều cao cố định, không xô lệch bố cục): còn 150–200 ms |
| Thành phố bùn trên mobile: bấm "Kiểm tra" làm bản đồ co từ 405 xuống 300 px đúng lúc người dân bắt đầu đi dạo, vì dòng trạng thái và thẻ phản hồi cùng hiện | Thẻ phản hồi thay cho dòng trạng thái: bản đồ còn 371 px |

Phần khựng còn lại là bước layout khi hộp kết quả xuất hiện, khoảng 120 ms ở CPU 4× (khoảng 30 ms ở tốc độ thật). Mức này được chấp nhận và ghi vào giới hạn trong README.

Đổi kích thước giữa màn (ch6-l03, đang chơi):

| Cỡ | Bàn chơi | Tràn ngang | Đỉnh nằm ngoài bàn |
|---|---|---|---|
| 1440×900 | 1044×755 | không | 0 |
| 375×812 | 367×480 | không | 0 |
| 812×375 (ngang) | 476×315 | không; trang cuộn dọc vì màn chơi cao tối thiểu 460 px | 0 |
| 768×1024 | 432×879 | không | 0 |
| quay lại 1440×900 | 1044×755 | không | 0 |

## Vòng 6 · Rà soát cuối

| Vấn đề | Cách sửa | Giữ bằng |
|---|---|---|
| "Xóa tiến độ trên máy này" làm sảnh hiện 0 điểm, trái với dòng "Điểm thưởng đã cộng … không bị xóa" ngay trên nút | Giữ nguyên tổng điểm khi xóa tiến độ | `flows.spec.ts` "Xóa tiến độ trên máy" |
| Hàm `onEvent` của trang chủ ném lỗi khi nhận `learning_event` thì hộp kết quả không hiện | Bỏ qua lỗi đó, như với các sự kiện analytics | – |
| Chế độ Đua với máy mới có e2e cho 1 màn | Thêm e2e cho cả 13 màn đua | `levels.spec.ts` |
| `npm run e2e` chạy luôn dự án chụp ảnh và ghi đè `docs/screens/` | `npm run e2e` chỉ chạy desktop và mobile; chụp ảnh là `npm run shots` | – |

## Kết quả kiểm thử cuối

Chạy ngày 12/10/2026 trên Windows 11, Node 22.22, Chromium của Playwright 1.64:

| Lệnh | Kết quả |
|---|---|
| `npm run typecheck` | không lỗi |
| `npm test` (Vitest) | 259/259 qua (6 file) |
| `npm run e2e` (desktop + mobile) | 184 qua, 2 bỏ qua (hai test cỡ tablet chỉ chạy trong dự án desktop), 4,2 phút |
| `npm run build` | JS 439 kB (gzip 138 kB), CSS 58 kB (gzip 11.5 kB) |
| `npm run build:embed` | `ltdt-games.js` 439 kB (gzip 138 kB), `ltdt-games.css` 58 kB (gzip 11.5 kB) |
| `npm run shots` | 26 ảnh trong `docs/screens/` (desktop và mobile) |
