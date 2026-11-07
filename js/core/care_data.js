/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
export const CARE_RANKS=['Chăm sóc cơ bản 基本介助','Đẩy xe lăn 車椅子介助','Thay quần áo 更衣介助','Hỗ trợ vệ sinh 排泄介助','Tắm cho cụ 入浴介助',
'Đo sinh hiệu バイタル測定','Bàn giao ca 申し送り','Tổ chức hoạt động レクリエーション','Kèm người mới 新人指導','Trưởng ca リーダー'];
export const CARE_DAYS=[
{
story:{title:'Ngày đầu ở viện',who:'tanaka',jp:'「利用者さんには、丁寧な言葉で話してくださいね。」',text:'Bạn đi chào các cụ trong phòng ăn. Một cụ bà mỉm cười với bạn.',
choices:[
{t:'Cúi chào: 「はじめまして。よろしくお願いします、山田さん」',fx:{boss:6,team:4,culture:3},r:'Cụ bà nắm tay bạn: 「かわいいねえ」.',lesson:'Gọi các cụ bằng họ + 〜さん, ví dụ 山田さん.'},
{t:'Vẫy tay: 「やあ、おばあちゃん！」',fx:{boss:-5,culture:2},r:'Quản lý nhắc nhỏ: 「〜さんと呼んでね」.',lesson:'Tránh gọi おばあちゃん/おじいちゃん với người không phải người nhà.'},
],after:'Cụ Yamada ăn hết bát cháo. Bạn thấy nhẹ cả người.'},
a:{goal:3,hintDelay:0,decay:0.8,urgent:0,label:'Ca sáng: bữa sáng cho các cụ'},
drama:{title:'Cụ ngã trong phòng',who:'sato',jp:'「田中さんが転んだ！」',text:'Chị Satō hốt hoảng gọi bạn: cụ Tanaka ngã cạnh giường.',
choices:[
{t:'Không nâng cụ, gọi y tá ngay: 「すぐ来てください！」',fx:{boss:7,culture:5},ally:true,r:'Y tá kiểm tra kỹ rồi mới đỡ cụ dậy. Cụ không sao.',lesson:'Cụ ngã thì đừng tự nâng: gọi y tá kiểm tra trước để tránh chấn thương nặng hơn.'},
{t:'Vội đỡ cụ lên giường',fx:{boss:-7,mental:-5},r:'Cụ kêu đau hông. Quản lý rất lo: 「まず看護師を呼んで！」'},
]},
b:{goal:4,limit:70,hintDelay:0,decay:0.8,urgent:0,label:'Ca chiều: giờ uống trà',jp:'「お茶の時間ですよ」',vi:'Chăm sóc đủ 4 lượt trước giờ giao ca'},
},
{
story:{title:'Cụ không chịu ăn',who:'tanaka',jp:'「無理に食べさせないでね。」',text:'Cụ Suzuki quay mặt đi, không chịu ăn.',
choices:[
{t:'Dừng lại, hỏi nhẹ nhàng rồi báo quản lý',fx:{boss:6,culture:4},r:'Hóa ra cụ đau răng. Bếp làm món mềm hơn cho cụ.',lesson:'誤嚥 (goen): ép ăn dễ làm cụ sặc vào phổi.'},
{t:'Đút nhanh cho xong việc',fx:{boss:-6,mental:-5},r:'Cụ bị sặc. Cả phòng hoảng hốt.'},
],after:'Bạn ghi vào sổ bàn giao lần đầu: 「お昼、半分食べました」.'},
a:{goal:3,hintDelay:2,decay:1.1,urgent:1,label:'Ca sáng: thay ca, giúp ăn'},
drama:{title:'Người nhà phàn nàn',who:'tanaka',jp:'「母の服が違うんです！」',text:'Con gái một cụ bà rất giận: mẹ cô đang mặc nhầm áo của người khác.',
choices:[
{t:'Cúi đầu: 「申し訳ございません。すぐ確認いたします」',fx:{boss:6,culture:5},ally:true,r:'Người nhà dịu lại. Bạn ghi tên lên đồ của từng cụ.'},
{t:'“Không phải em làm ạ”',fx:{boss:-5,mental:-3},watch:true,r:'Người nhà càng giận, quản lý phải ra xin lỗi.'},
]},
b:{goal:5,limit:75,maxMiss:3,hintDelay:2,decay:1.1,urgent:1,label:'Ca chiều: cả nhà nhìn vào',jp:'「ご家族が見ていますよ」',vi:'Chọn sai việc quá 3 lần là bị phàn nàn. Chú ý đỡ cụ khi cụ đứng dậy!'},
},
{
story:{title:'“Tôi muốn về nhà”',who:'sato',jp:'「家に帰りたい…子どもが待ってるの。」',text:'Một cụ bà đòi về đón con. Người con ấy giờ đã hơn 60 tuổi.',
choices:[
{t:'Ngồi xuống cạnh cụ: 「そうなんですね。お子さんのこと、聞かせてください」',fx:{mental:5,culture:5,boss:4},r:'Cụ kể về con say sưa rồi bình tĩnh lại.',lesson:'受容 (juyou): đón nhận cảm xúc của cụ trước, không cãi lại.'},
{t:'Giải thích: 「違いますよ、ここが家です」',fx:{mental:-4,boss:-2},r:'Cụ càng hoảng, khóc mãi không thôi.'},
],after:'Bạn nhớ tên từng cụ rồi.'},
a:{goal:4,hintDelay:3,decay:1.0,urgent:1,waitMin:5.8,waitRand:4.5,label:'Ca sáng: tắm và ăn sáng'},
drama:{title:'Lời nói sau lưng',who:'sato',jp:'「外国人って、言葉も分からないのにね。」',text:'Bạn nghe thấy một đồng nghiệp nói sau lưng mình.',
choices:[
{t:'Ghi lại từ chưa hiểu, nhờ người khác dạy thêm, cho thấy bằng việc làm',fx:{jp:4,mental:2},ally:true,r:'Vài tuần sau, chính người đó nhờ bạn giúp một việc khó.',lesson:'ハラスメント: nếu lời nói làm bạn tổn thương kéo dài, hãy báo quản lý hoặc nghiệp đoàn.'},
{t:'Đáp trả ngay trước mặt các cụ',fx:{team:-6,boss:-4},watch:true,r:'Các cụ sợ hãi. Quản lý gọi cả hai lên.'},
{t:'Trốn vào nhà vệ sinh khóc',fx:{mental:-6},r:'Bạn thấy nặng lòng cả buổi chiều.'},
]},
b:{goal:5,limit:70,maxMiss:3,hintDelay:3,decay:1.0,urgent:1,waitMin:5.8,waitRand:4.5,label:'Ca chiều: phải vững tâm',jp:'「落ち着いて」',vi:'Giữ bình tĩnh: 5 lượt, ưu tiên cụ đang tụt hài lòng trước'},
},
{
story:{title:'Trực sáng thiếu người',who:'tanaka',jp:'「今日は二人休みなの。お願いできる？」',text:'Hai người nghỉ ốm, quản lý nhờ bạn làm thêm việc.',
choices:[
{t:'「はい、頑張ります。分からないことは聞きます」',fx:{boss:6,mental:-2},r:'「ありがとう、助かる！」'},
{t:'Im lặng rồi làm hết theo ý mình',fx:{boss:-3},r:'Bạn làm nhầm thứ tự bữa ăn của hai cụ.'},
],after:'Một ngày dài nữa đã qua.'},
a:{goal:4,hintDelay:4,decay:1.2,urgent:1,waitMin:5.2,waitRand:3.9,label:'Ca sáng: thiếu hai người'},
drama:{title:'Giường trống của cụ Kimura',who:'tanaka',jp:'「木村さん、昨夜、病院に運ばれました。」',text:'Sáng nay giường cụ Kimura trống.',
choices:[
{t:'Cho phép mình buồn, rồi hỏi quản lý cách viết thư thăm',fx:{mental:4,culture:5},ally:true,r:'「優しいね。一緒に書こう。」 Quản lý ngồi viết cùng bạn.'},
{t:'Cố không nghĩ tới, làm cho xong việc',fx:{mental:-5},r:'Đến tối bạn mới thấy mệt rã rời.'},
]},
b:{goal:6,limit:85,maxMiss:3,hintDelay:4,decay:1.2,urgent:2,waitMin:5.2,waitRand:3.9,label:'Ca chiều: thiếu người, nhiều việc',jp:'「人手が足りません！」',vi:'Một mình lo 6 lượt, nghĩa tiếng Việt hiện sau 4 giây'},
},
{
story:{title:'Đoàn kiểm tra đến thăm',who:'tanaka',jp:'「今日は監査が来ます。いつも通りにね。」',text:'Đoàn kiểm tra sẽ xem sổ sách và cách chăm sóc các cụ.',
choices:[
{t:'Làm đúng như thường ngày, ghi sổ đầy đủ',fx:{boss:6,culture:4},r:'Đoàn kiểm tra khen sổ ghi chép rõ ràng.',lesson:'記録 (kiroku): ghi chép đúng giờ, đúng sự thật là một phần của chăm sóc.'},
{t:'Điền bù sổ cho những việc hôm qua quên ghi',fx:{boss:-5,mental:-4},r:'Giờ ghi lệch nhau, đoàn kiểm tra hỏi lại rất lâu.'},
],after:'Một tuần ở viện dưỡng lão đã qua.'},
a:{goal:4,hintDelay:4,decay:1.4,urgent:1,waitMin:4.55,waitRand:3.9,label:'Ca sáng: chuẩn bị đoàn kiểm tra'},
drama:{title:'Cụ đi lạc lúc kiểm tra',who:'sato',jp:'「鈴木さんがいない！」',text:'Đoàn kiểm tra đang ở đây thì không thấy cụ Suzuki đâu.',
choices:[
{t:'Báo ngay, chia nhau tìm theo khu vực',fx:{boss:8,team:5},ally:true,r:'Năm phút sau cả nhóm tìm thấy cụ ở vườn sau.',lesson:'離設 (risetsu): cụ rời viện không báo — báo ngay và chia nhau tìm theo khu vực.'},
{t:'Tự đi tìm không báo ai, sợ làm viện mất mặt',fx:{boss:-6,mental:-4},r:'Mất 30 phút mới tìm thấy cụ, mọi người rất lo.'},
]},
b:{goal:7,limit:90,maxMiss:3,hintDelay:4,decay:1.4,urgent:2,waitMin:4.55,waitRand:3.9,label:'Thử thách cuối tuần: đoàn kiểm tra',jp:'「監査中です！」',vi:'7 lượt chuẩn xác trước đoàn kiểm tra, có 2 sự cố khẩn'},
},
];
