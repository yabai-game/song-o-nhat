/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
export const LOTUS_RANKS=[
'Đào củ sen 蓮根掘り',
'Phân loại củ 選別',
'Đóng thùng 箱詰め',
'Vòi áp lực 水圧ホース',
'Trồng củ giống 植え付け',
'Điều tiết mực nước 水管理',
'Phát hiện sâu bệnh',
'Vận chuyển giao hàng 出荷',
'Kèm người mới',
'Tổ trưởng ruộng',
];
export const LOTUS_DAYS=[
{
story:{
title:'Ngày đầu xuống ruộng',who:'tanaka',
jp:'「おはよう！今日から一緒だね。長靴じゃなくて、胴長を着てね。」',
text:'Quản lý đưa bạn bộ quần lội (胴長). Bùn lạnh và sâu tới đùi.',
choices:[
{t:'「おはようございます！よろしくお願いします！」 rồi hỏi cách mặc',fx:{boss:6,team:4},r:'「元気だねえ！」 Quản lý cười, chỉ bạn buộc dây cho chặt.',lesson:'胴長 (dounaga): quần lội liền ủng tới ngực. Chưa biết cách mặc thì hỏi lại ngay.'},
{t:'Gật đầu cho qua, tự mặc theo ý mình',fx:{boss:-2,health:-3},r:'Dây lỏng, bùn tràn vào trong. Cả buổi sáng bạn lạnh run.',lesson:'Khi chưa hiểu rõ, hãy nói 「すみません、もう一度お願いします」.'},
],
after:'Lần đầu tự tay đào được củ sen. Người đau ê ẩm, nhưng cũng vui.',
},
a:{goal:2,pullPeriod:2.7,pullZone:0.45,weeds:false,label:'Ca sáng: đào 2 củ'},
drama:{
title:'Máy bơm nghẹt',who:'sato',
jp:'「ポンプが止まった！」',
text:'Máy bơm nước xịt bùn tự nhiên ngừng chạy.',
choices:[
{t:'Chạy đi báo, hỏi: 「何か手伝いましょうか」',fx:{team:5},ally:true,r:'Hai người gỡ được rác trong ống. Chị Satō nhớ công bạn.'},
{t:'Đứng chờ, coi như giờ nghỉ',fx:{team:-3,boss:-2},r:'Quản lý đi ngang qua nhìn thấy bạn đứng không.',lesson:'指示待ち (chờ sai mới làm): ở Nhật rất quý người chủ động hỏi 「何か手伝いましょうか」.'},
],
},
b:{goal:3,limit:60,pullPeriod:2.7,pullZone:0.45,weeds:false,label:'Ca chiều: kịp xe chở hàng',jp:'「トラックが来るぞ！」',vi:'Xe chở hàng sắp tới, đào xong 3 củ trước khi hết giờ'},
},
{
story:{
title:'Củ sen bị gãy',who:'tanaka',
jp:'「この蓮根、折れてるね。誰がやった？」',
text:'Một củ sen trong giỏ bị gãy đôi, bùn lọt vào trong nên chỉ bán được giá rẻ.',
choices:[
{t:'「すみません、私です。次は気をつけます」',fx:{boss:6,culture:4},r:'「正直でいいね。」 Quản lý chỉ lại cách luồn tay dưới củ trước khi nhổ.',lesson:'報連相 (hōrensō): làm hỏng thì báo ngay khi vừa xảy ra.'},
{t:'Im lặng, giấu củ gãy xuống đáy giỏ',fx:{boss:-6,mental:-4},r:'Lúc đóng thùng vẫn lộ ra. Giấu lỗi bị mắng nặng hơn làm gãy.',lesson:'Giấu lỗi luôn nặng hơn bản thân lỗi đó.'},
],
after:'Lần này bạn xịt nước kỹ hơn. Không củ nào gãy.',
},
a:{goal:3,pullPeriod:2.6,pullZone:0.42,weeds:false,label:'Ca sáng: đào 3 củ'},
drama:{
title:'Ai lấy củ của tôi?',who:'hung',
jp:'「これ、俺の分にしとくわ。」',
text:'Một người làm cùng lấy củ sen trong giỏ của bạn bỏ sang giỏ mình.',
choices:[
{t:'Nói riêng với người đó, rồi nhờ chị Hoa nếu không xong',fx:{mental:3,culture:4},ally:true,r:'Chị Hoa trao đổi với quản lý, mỗi giỏ được gắn thẻ tên rõ ràng.'},
{t:'Bỏ qua, nuốt cục tức',fx:{mental:-5},r:'Bạn ấm ức cả buổi chiều.'},
{t:'Mắng thẳng trước mọi người',fx:{team:-5,boss:-3},watch:true,r:'Cả ruộng im bặt. Quản lý nhắc cả hai giữ trật tự.'},
],
},
b:{goal:4,limit:75,maxMiss:3,pullPeriod:2.6,pullZone:0.42,weeds:false,label:'Ca chiều: không được sai bước',jp:'「順番を守れ！」',vi:'Canh chuẩn thanh lực nhổ: sai quá 3 lần là hỏng củ!'},
},
{
story:{
title:'Trời trở lạnh',who:'hoa',
jp:'「寒いから、無理しないでね。」',
text:'Gió lạnh thổi qua ruộng nước, hai bàn tay bạn tê cứng. Chị Hoa ghé thăm hỏi han.',
choices:[
{t:'Nói thật: tay bị đau, xin nghỉ 5 phút: 「少し休んでもいいですか」',fx:{health:5,mental:4,culture:3},r:'Bạn được vào lán uống nước ấm và dán miếng sưởi カイロ.',lesson:'Xin nghỉ ngắn khi tay tê cóng giúp tránh chấn thương khi lao động.'},
{t:'Cắn răng chịu, sợ bị chê yếu',fx:{health:-6,boss:2},r:'Xong ca, bạn cầm đũa không nổi.',lesson:'Có bảo hiểm y tế và bảo hiểm tai nạn lao động (労災), đừng giấu khi cơ thể quá sức.'},
],
after:'Bạn bắt đầu quen với bùn rồi.',
},
a:{goal:3,walk:0.85,pullPeriod:2.5,pullZone:0.39,weeds:true,label:'Ca sáng: đào trong gió lạnh'},
drama:{
title:'Bạn cùng phòng ốm',who:'hung',
jp:'「熱があるみたいだ…」',
text:'Anh Hùng sốt cao từ đêm qua, sáng dậy không nổi.',
choices:[
{t:'Báo Quản lý và gọi chị Hoa đưa anh đi khám',fx:{team:6,culture:4},ally:true,r:'Anh Hùng được đưa tới phòng khám và nghỉ phép có lương.',lesson:'Có thẻ bảo hiểm y tế chỉ trả 30% viện phí, và được dùng ngày phép có lương (有給休暇).'},
{t:'Làm hộ phần của anh, không nói ai',fx:{health:-6,team:3},r:'Bạn kiệt sức, còn anh Hùng ở nhà sốt cao hơn.'},
],
},
b:{goal:4,limit:70,rain:true,walk:0.75,pullPeriod:2.5,pullZone:0.39,weeds:true,label:'Ca chiều: mưa lớn',jp:'「雨が強くなってきた！」',vi:'Mưa lớn, gốc có cỏ dại 🌿 phải cắt cỏ trước khi đào!'},
},
{
story:{
title:'Giỏ bị đổ',who:'hung',
jp:'「おい、何やってんだ！」',
text:'Ai đó vô tình làm đổ giỏ củ sen bạn đã xếp gọn từ hôm qua.',
choices:[
{t:'Xếp lại ngay, rồi nói rõ với Quản lý chuyện đã xảy ra',fx:{boss:4,team:3},r:'Quản lý gật đầu: 「まあ、拾えばいい。」 Mọi người phụ một tay.',lesson:'Xử lý việc trước mắt rồi giải thích ngắn gọn sau.'},
{t:'Cãi: “Không phải em làm!”',fx:{boss:-4,mental:-3},r:'Sáng sớm đã ầm ĩ. Không ai vui.'},
],
after:'Một ngày dài nữa đã qua.',
},
a:{goal:3,pullPeriod:2.3,pullZone:0.37,weeds:true,label:'Ca sáng: phân loại, đào tiếp'},
drama:{
title:'Lương thiếu tiền',who:'hoa',
jp:'「給与明細、見ましたか？」',
text:'Phiếu lương tháng này thiếu mất 12 giờ tăng ca.',
choices:[
{t:'Ghi lại giờ làm, nhờ chị Hoa hỏi giúp',fx:{money:18000,culture:5},r:'Kế toán kiểm tra lại sổ chấm công và trả bù đủ 18.000 ¥.',lesson:'Luôn tự ghi lại giờ làm mỗi ngày. Khi cần có thể nhờ nghiệp đoàn hoặc cơ quan giám sát lao động.'},
{t:'Bỏ qua cho yên chuyện',fx:{mental:-4},r:'12 giờ công mất trắng.'},
],
},
b:{goal:5,limit:80,maxMiss:3,pullPeriod:2.3,pullZone:0.37,weeds:true,label:'Ca chiều: bù giờ đã mất',jp:'「遅れを取り戻すぞ！」',vi:'Bù lại tiến độ: 5 củ, cắt cỏ + canh lực nhổ thật chuẩn'},
},
{
story:{
title:'Đơn hàng cuối năm',who:'tanaka',
jp:'「年末の注文が入った。今日は勝負だぞ！」',
text:'Cuối năm người Nhật mua củ sen làm món Tết (おせち) rất nhiều. Hôm nay có đơn gấp.',
choices:[
{t:'「任せてください！」',fx:{boss:5,mental:2},r:'Quản lý cười lớn: 「頼もしいな！」'},
{t:'Hỏi có được trả tiền tăng ca không',fx:{culture:3},r:'「もちろん、残業代は出すよ。」 Hỏi rõ không phải là thất lễ.'},
],
after:'Một ngày dài nữa đã qua.',
},
a:{goal:4,pullPeriod:2.2,pullZone:0.35,weeds:true,label:'Ca sáng: đơn hàng đợt 1'},
drama:{
title:'Một giỏ bị trả về',who:'tanaka',
jp:'「お客さんから返品だ。傷がある。」',
text:'Khách hàng trả lại một giỏ vì củ sen bị trầy xước khi vận chuyển.',
choices:[
{t:'Cùng mọi người kiểm tra lại, đề xuất lót rơm vào giỏ',fx:{boss:7,team:5},ally:true,r:'「いいアイデアだ！」 Từ hôm đó tỷ lệ trầy xước giảm hẳn.',lesson:'改善 (kaizen): đề xuất cải tiến nhỏ từ người trực tiếp làm luôn được đánh giá cao.'},
{t:'“Không phải giỏ của em”',fx:{boss:-4,team:-4},r:'Không khí cả tổ nặng nề.'},
],
},
b:{goal:6,limit:90,maxMiss:3,rain:true,walk:0.85,pullPeriod:2.2,pullZone:0.35,weeds:true,label:'Thử thách cuối tuần: 6 củ trong mưa',jp:'「今日は勝負だ！」',vi:'Trận cuối tuần: 6 củ, mưa, vùng lực nhổ hẹp 35%'},
},
];
