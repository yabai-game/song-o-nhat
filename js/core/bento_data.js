/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
export const BENTO_RANKS=[
'Gắp món 盛り付け',
'Gắp tốc độ cao 高速ライン',
'Định lượng cơm ご飯の計量',
'Đóng nắp, dán nhãn フタ・ラベル',
'Kiểm tra dị vật 異物検査',
'Canh chảo chiên フライヤー',
'Kiểm tra nhiệt độ 温度管理',
'Quản lý kho 在庫管理',
'Phó tổ dây chuyền 副班長',
'Trưởng dây chuyền 班長',
];
export const BENTO_DAYS=[
{
story:{
title:'Rửa tay 30 giây',who:'tanaka',
jp:'「手洗いは30秒。ネットから髪が出てないか確認して。」',
text:'Trước khi vào dây chuyền, tổ trưởng kiểm tra từng người ở bồn rửa tay và gương soi.',
choices:[
{t:'Rửa đủ 30 giây, nhờ bạn kiểm tra tóc giúp',fx:{boss:6,culture:4},r:'「はい、OK！」 Bạn bước vào dây chuyền tự tin.',lesson:'衛生第一 (eisei daiichi): ở xưởng thực phẩm, vệ sinh là số một.'},
{t:'Rửa qua loa cho kịp giờ',fx:{boss:-6},r:'Tổ trưởng bắt quay lại rửa từ đầu trước mặt cả tổ.'},
],
after:'Tám tiếng đứng một chỗ. Nhắm mắt vẫn thấy băng chuyền.',
},
a:{goal:5,speed:1.4,multi:[1,1],defect:0,label:'Ca sáng: 5 hộp'},
drama:{
title:'Sợi tóc',who:'sato',
jp:'「あれ？これ、髪の毛…？」',
text:'Chị Satō thoáng thấy một sợi tóc trong khay cơm đang chuẩn bị đóng nắp.',
choices:[
{t:'Gọi ngay: 「すみません！異物です！」',fx:{boss:7,culture:4},ally:true,r:'Tổ trưởng dừng băng, thay khay mới và khen bạn tinh mắt.',lesson:'異物混入 (ibutsu konnyū): phát hiện dị vật phải báo ngay để tách khay đó ra.'},
{t:'Lén nhặt đi cho nhanh',fx:{boss:-3,mental:-2},r:'Tổ trưởng nhìn thấy qua gương, nhắc nhở nghiêm khắc.'},
],
},
b:{goal:7,maxMiss:3,speed:1.5,multi:[1,1],defect:0,label:'Ca chiều: băng chạy nhanh hơn',jp:'「スピードアップ！」',vi:'Tốc độ tăng. Sai quá 3 lần là cả dây chuyền phải dừng'},
},
{
story:{
title:'Nhầm món',who:'tanaka',
jp:'「ちょっと待って！アレルギーの表示、見た？」',
text:'Bạn chợt nhận ra mấy hộp vừa trôi qua bị đặt nhầm món có chất gây dị ứng so với nhãn.',
choices:[
{t:'Hô ngay: 「すみません、止めてください！」',fx:{boss:7,culture:5},r:'Dây chuyền dừng 2 phút. Quản lý bảo: 「よく言った。」',lesson:'Nhầm chất dị ứng (アレルゲン) có thể nguy hiểm tính mạng khách hàng — phải dừng ngay.'},
{t:'Lờ đi, sợ bị mắng vì làm dừng máy',fx:{boss:-8,mental:-6},r:'Khâu kiểm cuối phát hiện ra, cả lô 200 hộp phải đổ bỏ.'},
],
after:'Tay bạn gắp nhanh hơn hẳn hôm qua.',
},
a:{goal:6,speed:1.5,multi:[1,2],defect:0.125,label:'Ca sáng: 6 hộp'},
drama:{
title:'Đổi ca đêm',who:'tanaka',
jp:'「急だけど、今夜入れる？」',
text:'Tổ trưởng hỏi bạn có thể vào làm luôn ca đêm tối nay vì thiếu người không.',
choices:[
{t:'「今日は難しいです。明日なら大丈夫です」',fx:{mental:4,culture:4},r:'Tổ trưởng gật đầu, sắp xếp lịch cho ngày mai.'},
{t:'Nhận luôn cho vừa lòng',fx:{money:12000,health:-8,boss:5},r:'Có thêm tiền phụ cấp nhưng sáng hôm sau bạn mệt rã rời.'},
],
},
b:{goal:8,maxMiss:3,speed:1.6,multi:[1,2],defect:0.125,label:'Ca chiều: nhanh và đúng',jp:'「間違えないで！」',vi:'Đơn 1–2 món, gặp hộp lỗi nhớ bấm 🚫 Loại 不良!'},
},
{
story:{
title:'Bạn bên cạnh bị chậm',who:'sato',
jp:'「ごめん、ちょっと遅れてる…」',
text:'Khay dồn lại trước chỗ chị Satō đứng cạnh bạn.',
choices:[
{t:'「手伝います！」 rồi gắp đỡ một món',fx:{team:8,culture:3},r:'Nhịp dây chuyền ổn định lại. Chị mỉm cười: 「ありがとう、助かった！」'},
{t:'Việc ai nấy làm, tập trung phần mình',fx:{team:-4},r:'Khay bị ùn ở cuối băng, cả tổ phải dừng lại xếp.'},
],
after:'Bạn đã có người để ăn trưa cùng.',
},
a:{goal:6,speed:1.5,multi:[1,3],defect:0.125,label:'Ca sáng: 6 hộp'},
drama:{
title:'Đồng hương bị đuổi?',who:'hung',
jp:'「ベトナム人のあの子、クビらしいよ。」',
text:'Giờ nghỉ có tin đồn một bạn thực tập sinh ở dây chuyền bên cạnh sắp bị cho nghỉ việc.',
choices:[
{t:'Hỏi chị Hoa để biết sự thật, giúp bạn liên hệ nghiệp đoàn',fx:{culture:6,senpai:5},ally:true,r:'Chị Hoa giải thích rõ hiểu lầm và hỗ trợ bạn ấy kịp thời.'},
{t:'Kéo cả nhóm đình công ngay',fx:{boss:-7,team:-3},watch:true,r:'Hóa ra bạn ấy chỉ xin nghỉ phép về nước. Quản lý để ý bạn từ đó.'},
],
},
b:{goal:9,maxMiss:3,speed:1.65,multi:[1,3],defect:0.125,label:'Ca chiều: cả nhóm đang căng thẳng',jp:'「集中して！」',vi:'Tập trung: 9 hộp (2–3 món/hộp), sai tối đa 3 lần'},
},
{
story:{
title:'Máy lạnh hỏng',who:'tanaka',
jp:'「冷蔵庫の温度が上がってる！」',
text:'Nhiệt kế kho mát báo cao hơn mức quy định.',
choices:[
{t:'Báo ngay, đề nghị kiểm tra lô nguyên liệu',fx:{boss:6,culture:4},r:'Thợ sửa kịp thời, lô nguyên liệu được chuyển sang tủ dự phòng an toàn.',lesson:'温度管理 (ondo kanri): kiểm soát nhiệt độ giúp ngăn vi khuẩn sinh sôi.'},
{t:'“Chắc không sao”, cứ dùng tiếp',fx:{boss:-7,mental:-3},r:'Quản lý phát hiện lúc kiểm tra định kỳ và mắng cả ca.'},
],
after:'Một ngày dài nữa đã qua.',
},
a:{goal:7,speed:1.6,multi:[2,3],defect:0.125,label:'Ca sáng: 7 hộp'},
drama:{
title:'Nhãn in sai',who:'sato',
jp:'「賞味期限、間違ってない？」',
text:'Chị Satō phát hiện máy in hạn sử dụng đang nhảy sai ngày trong lúc quản lý đang họp.',
choices:[
{t:'Gõ cửa phòng họp báo ngay',fx:{boss:8,culture:5},ally:true,r:'Quản lý chạy ra dừng máy kịp thời: 「ありがとう！」'},
{t:'Đợi hết họp rồi nói',fx:{boss:-5},r:'Hàng trăm hộp đã đóng thùng phải bóc ra dán lại.'},
],
},
b:{goal:10,maxMiss:3,speed:1.75,multi:[2,3],defect:0.125,label:'Ca chiều: làm lại 300 hộp',jp:'「やり直しだ！」',vi:'10 hộp (2–3 món), tốc độ rất cao'},
},
{
story:{
title:'Đơn 3.000 hộp',who:'tanaka',
jp:'「今日は3000食！全員で乗り切るよ！」',
text:'Cuối tuần có đơn hàng lớn, cả xưởng tất bật từ sáng sớm.',
choices:[
{t:'「頑張りましょう！」 và chia việc với chị Satō',fx:{team:5,boss:4},r:'Chị Satō nháy mắt: 「一緒にがんばろう！」'},
{t:'Cắm cúi làm, không nói gì',fx:{mental:-2},r:'Không khí căng thẳng suốt cả buổi sáng.'},
],
after:'Một tuần ở xưởng cơm hộp đã qua.',
},
a:{goal:7,speed:1.65,multi:[2,3],defect:0.125,label:'Ca sáng: 3.000 hộp, đợt 1'},
drama:{
title:'Băng chuyền dừng đột ngột',who:'tanaka',
jp:'「ラインが止まった！」',
text:'Giữa ca chiều băng chuyền phụ bị kẹt vài phút, tiến độ có nguy cơ chậm giờ xe lấy hàng.',
choices:[
{t:'Giữ nguyên kiểm tra, đề xuất chia nhóm làm tay',fx:{boss:8,team:6},ally:true,r:'Cả nhóm phối hợp nhịp nhàng, kịp giờ xe mà không bỏ sót bước kiểm tra nào.',lesson:'品質第一 (hinshitsu daiichi): dù gấp đến đâu cũng không được bỏ bước kiểm tra chất lượng.'},
{t:'Bỏ kiểm tra cho kịp',fx:{boss:-8,mental:-5},watch:true,r:'Tổ trưởng phát hiện và yêu cầu kiểm lại toàn bộ lô hàng.'},
],
},
b:{goal:12,maxMiss:4,speed:1.8,multi:[2,3],defect:0.125,label:'Thử thách cuối tuần: 3.000 hộp',jp:'「ラストスパート！」',vi:'Về đích: 12 hộp (2–3 món + loại hộp lỗi), nhanh nhất từ trước tới nay'},
},
];
