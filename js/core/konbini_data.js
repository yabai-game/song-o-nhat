/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
export const KONBINI_RANKS=[
'Học việc レジ',
'Thu ngân',
'Lên kệ 品出し',
'Đồ nóng ホットスナック',
'Kiểm hàng 検品',
'Ca đêm 夜勤',
'Đặt hàng 発注',
'Kèm người mới',
'Trưởng ca',
'Phó cửa hàng 副店長',
];
export const KONBINI_DAYS=[
{
story:{
who:'tanaka',title:'Câu chào mở đầu ca',
jp:'コンビニの基本は元気な「いらっしゃいませ」と「ありがとうございました」だ。お釣りはしっかり数えて渡そう。',
text:'Cửa hàng trưởng Tanaka đưa cho bạn chiếc áo đồng phục xanh nhạt của サクラマート: "Ở konbini, ấn tượng đầu tiên là tiếng chào いらっしゃいませ thật tươi tỉnh. Quét từng món một lần, nhận tiền mặt rồi đếm tiền thừa thật chuẩn trước khi cảm ơn khách nhé."',
choices:[
{
t:'Dõng dạc tập nói 「いらっしゃいませ！」 và 「ありがとうございました！」',
r:'Tanaka gật đầu hài lòng: "Giọng rõ ràng lắm! Khách vào nghe thế là thấy ấm lòng rồi."',
fx:{boss:5,jp:3,culture:3},
lesson:'Hai câu cửa miệng của nhân viên bán lẻ Nhật Bản: いらっしゃいませ (kính chào quý khách) khi khách tới và ありがとうございました (cảm ơn quý khách) khi khách rời quầy.',
},
{
t:'Hỏi kỹ cách đặt tiền thừa lên khay (コイントレー) để khách dễ kiểm',
r:'Tanaka chỉ vào khay nhỏ cạnh máy: "Đặt tiền giấy trước, tiền xu lên trên rồi đọc rõ số tiền thừa nhé."',
fx:{boss:6,culture:4},
},
{
t:'Nói nhỏ lí nhí vì ngại phát âm tiếng Nhật trước đông người',
r:'Tanaka vỗ vai khích lệ: "Mới sang ai cũng ngại, nhưng nói to rõ thì khách mới nghe được mình hỏi gì."',
fx:{boss:-2,mental:-1,jp:1},
},
],
after:'Đứng quầy ngày đầu hơi mỏi chân, nhưng tiếng chuông cửa konbini nghe đã bắt đầu quen tai.',
},
a:{
label:'Ca sáng: Tập đứng quầy thu ngân',
goal:3,maxMiss:3,items:[1,2],patience:45,hintDelay:0,roundCash:true,
jp:'まずは笑顔で挨拶して、商品を一つずつスキャンしよう。',
vi:'Phục vụ 3 lượt khách đầu tiên: chào いらっしゃいませ → quét 1–2 món → thối tiền mặt tròn (khách đưa 1.000円) → cảm ơn.',
},
drama:{
who:'sato',title:'Đọc to số tiền nhận từ khách',
jp:'1,000円お預かりします！声に出して確認すると間違いが減るわよ。',
text:'Đồng nghiệp Sato đứng quầy bên cạnh dặn bạn: "Lúc khách đưa tờ 1.000円, em nhớ nhìn kỹ mệnh giá rồi đọc to số tiền nhận và số tiền thối. Đừng bấm vội kẻo nhầm xu 100円 với 50円 đấy!"',
choices:[
{
t:'Nghe lời chị Sato, kiểm kỹ từng đồng xu trên màn hình trước khi bấm Đưa tiền',
r:'Chị Sato mỉm cười: "Cẩn thận thế là yên tâm rồi. Có gì bí cứ hỏi chị nhé!"',
fx:{team:5,jp:2,culture:2},ally:true,
lesson:'Khi thu ngân ở Nhật, nhân viên luôn xác nhận số tiền nhận (〇〇円お預かりします) và số tiền thừa (〇〇円のお返しです) để tránh nhầm lẫn.',
},
{
t:'Đáp qua loa "Em tính nhẩm nhanh lắm, chị khỏi lo"',
r:'Sato nhắc nhẹ: "Nhanh mấy lúc đông khách cũng dễ bấm nhầm lắm, cứ nhìn kỹ màn hình nhé."',
fx:{team:-3,boss:-2},watch:true,
},
],
},
b:{
label:'Ca chiều: Khách tan tầm ghé mua đồ',
goal:4,limit:150,maxMiss:3,items:[1,2],patience:40,hintDelay:0,roundCash:true,
jp:'夕方はお客さんが増えるぞ。落ち着いてお釣りを渡そう！',
vi:'4 lượt khách trong 150 giây, mỗi khách 1–2 món, khách đưa tờ 1.000円 tròn, tối đa 3 lỗi.',
},
},
{
story:{
who:'tanaka',title:'Hỏi túi ni-lông 3円',
jp:'レジ袋は1枚3円だ。「袋はご利用ですか？」と必ず確認しよう。',
text:'Buổi sáng, cửa hàng trưởng Tanaka nhắc quy định túi ni-lông tính phí: "Từ nay mọi khách đều phải hỏi 「袋はご利用ですか？」 (Quý khách có dùng túi không ạ?). Nếu khách trả lời はい thì bấm thêm túi 3円 vào hoá đơn, còn いいえ thì không cộng nhé."',
choices:[
{
t:'Nhẩm thuộc câu 「袋はご利用ですか？」 và lắng nghe chữ はい / いいえ của khách',
r:'Tanaka khen: "Chuẩn đấy! Nhiều khách mang túi vải riêng (マイバッグ) nên nhớ nghe kỹ trước khi bấm."',
fx:{boss:5,jp:4,culture:3},
lesson:'Ở Nhật Bản, túi ni-lông tại cửa hàng tiện lợi có tính phí (thường 3円–5円). Nhân viên luôn hỏi 袋はご利用ですか？ trước khi tính tổng tiền.',
},
{
t:'Hỏi thêm chị Sato cách phân biệt khi khách lắc đầu nói 大丈夫です (không cần đâu)',
r:'Chị Sato chỉ ngay: "Khi khách nói いいえ hoặc 大丈夫です lúc hỏi túi nghĩa là họ không lấy túi nhé!"',
fx:{team:5,jp:3},ally:true,
},
],
after:'Bạn đã quen miệng hỏi 袋はご利用ですか？ mỗi khi quét xong món cuối.',
},
a:{
label:'Ca sáng: Tập hỏi túi đựng hàng',
goal:3,maxMiss:3,items:[1,2],bag:true,patience:42,hintDelay:2,
jp:'スキャンのあとに「袋はご利用ですか？」と聞こう。',
vi:'3 lượt khách: quét hàng xong hỏi túi 袋はご利用ですか？ (nếu khách lấy túi thì cộng thêm 3円). Nghĩa tiếng Việt hiện sau 2 giây.',
},
drama:{
who:'tanaka',title:'Két tiền thiếu 100円 cuối ca',
jp:'レジ締めをしたら100円足りないな…心当たりはあるかい？',
text:'Giữa ngày khi kiểm két tiền giao ca (レジ締め), máy báo hụt mất 100円 so với doanh thu trên hệ thống. Cửa hàng trưởng Tanaka hỏi xem bạn có nhớ lượt nào thối nhầm không, trong túi bạn lại đang sẵn đồng 100円 của mình.',
choices:[
{
t:'Thành thật báo với 店長 và cùng kiểm lại cuộn biên lai giao dịch',
r:'Hai thầy trò dò lại phát hiện một đồng 100円 bị kẹt dưới khe khay xu. Tanaka thở phào: "Báo trung thực ngay như vậy mới là nhân viên đáng tin cậy!"',
fx:{boss:8,mental:3,culture:4},
lesson:'Tại cửa hàng Nhật Bản, tuyệt đối không tự ý lấy tiền túi bù vào két thu ngân (違算) để giấu lỗi; phải báo ngay cho quản lý kiểm tra biên lai.',
},
{
t:'Lén bỏ đồng 100円 tiền túi của mình vào két cho khớp số rồi im lặng',
r:'Tanaka nhìn camera quầy thấy bạn tự bỏ tiền vào két nên nghiêm mặt nhắc: "Ở Nhật, thừa hay thiếu tiền két đều phải báo cáo, tự bù tiền riêng là sai quy định!"',
fx:{boss:-8,mental:-4,money:-100},watch:true,
},
{
t:'Đổ lỗi cho ca trước đếm sai chứ mình không hề bấm nhầm',
r:'Biên lai in rõ giờ giao dịch trong ca của bạn. Không khí trong cửa hàng trở nên nặng nề.',
fx:{boss:-10,team:-6,mental:-4},watch:true,
},
],
},
b:{
label:'Ca chiều: Quét hàng và hỏi túi',
goal:5,limit:165,maxMiss:3,items:[1,3],bag:true,patience:38,hintDelay:2,
jp:'袋の確認を忘れずに！3円の計算にも気をつけよう。',
vi:'5 lượt khách trong 165 giây, mỗi khách 1–3 món, có hỏi túi (+3円), tối đa 3 lỗi.',
},
},
{
story:{
who:'sato',title:'Cơm hộp, lò vi sóng và thẻ IC',
jp:'お弁当を買われたら「温めますか？」と「お箸はお付けしますか？」を聞くのよ。ICカードのお客さんも多いわ。',
text:'Chị Sato chỉ vào dãy lò vi sóng công suất lớn sau lưng quầy: "Khách mua cơm hộp お弁当 thì em nhớ hỏi 2 câu: có hâm nóng không (温めますか？) và có lấy đũa không (お箸はお付けしますか？). Còn khách trả bằng thẻ ICカード thì chỉ cần bấm nút IC, không phải thối tiền mặt!"',
choices:[
{
t:'Ghi nhớ: Cơm hộp → hỏi hâm nóng & hỏi đũa; khách trả ICカード → bấm nút IC',
r:'Chị Sato gật đầu: "Đúng rồi! Hỏi đúng thứ tự từng câu rồi làm theo ý khách là nhanh gọn nhất."',
fx:{team:5,jp:4,culture:3},
lesson:'Khi khách mua お弁当 ở konbini, hai câu hỏi chuẩn là 温めますか？ (Có hâm nóng không?) và お箸はお付けしますか？ (Có lấy đũa không?).',
},
{
t:'Thử chạm thẻ mẫu lên đầu đọc IC để quen tiếng "ピッ" thanh toán',
r:'Đầu đọc kêu "ピッ" thanh thoát. Tanaka đứng cạnh mỉm cười: "Thanh toán IC không cần đếm xu nên đỡ tốn thời gian lắm."',
fx:{boss:5,jp:2},
},
],
after:'Mùi cơm hộp hâm nóng thơm lừng cả góc quầy thu ngân.',
},
a:{
label:'Ca sáng: Khách mua cơm hộp & quẹt thẻ IC',
goal:4,maxMiss:3,items:[1,3],bag:true,bento:true,icRate:0.3,patience:40,hintDelay:3,
jp:'お弁当の温め・お箸の確認と、ICカード決済を練習しよう。',
vi:'4 lượt khách: có khách mua cơm hộp (hỏi hâm nóng + hỏi đũa + hỏi túi) và ~30% khách trả bằng ICカード.',
},
drama:{
who:'tanaka',title:'Chiếc ví bỏ quên trên kệ tạp chí',
jp:'大変だ、お客さんがカウンターの横に財布を忘れていかれたぞ！',
text:'Vừa vãn khách, bạn phát hiện một chiếc ví da dày cộm tiền mặt và thẻ ngân hàng nằm quên ngay bệ quầy thu ngân. Ngoài phố khách đã đi khuất, trong cửa hàng lúc này chỉ có mình bạn ở quầy.',
choices:[
{
t:'Gọi ngay cho 店長 lập sổ đồ thất lạc (忘れ物) và mang sang đồn cảnh sát 交番 gần đó',
r:'Tanaka lập biên bản ngay. Nửa tiếng sau vị khách quay lại nhận ví ở 交番, cảm ơn rối rít và gọi điện về trụ sở khen ngợi cửa hàng!',
fx:{boss:10,mental:6,culture:5},ally:true,
lesson:'Ở Nhật, khi nhặt được đồ thất lạc (忘れ物 / 落し物) trong cửa hàng, nhân viên phải báo ngay cho quản lý ghi nhận giờ giấc và bàn giao cho đồn cảnh sát (交番).',
},
{
t:'Cất tạm vào ngăn kéo cá nhân đợi cuối ca mới tính vì đang bận dọn kệ',
r:'Khách quay lại tìm ngay lúc đó, thấy ví nằm trong ngăn kéo cá nhân của bạn nên hiểu lầm một phen hú vía.',
fx:{boss:-8,mental:-6},watch:true,
},
],
},
b:{
label:'Ca chiều: Giờ cơm hộp và thanh toán IC',
goal:5,limit:175,maxMiss:3,items:[1,3],bag:true,bento:true,icRate:0.3,patience:36,hintDelay:3,
jp:'お弁当のお客さんには温めとお箸を聞こう！ICカードはワンタッチだ。',
vi:'5 lượt khách trong 175 giây, 1–3 món, có cơm hộp (hâm, đũa) và 30% khách trả ICカード, tối đa 3 lỗi.',
},
},
{
story:{
who:'tanaka',title:'Tủ đồ nóng và câu xin khách chờ',
jp:'今日からはホットスナックもお願いするぞ。並んでいるお客さんには「少々お待ちください」と声をかけよう。',
text:'Cửa hàng trưởng Tanaka mở tủ kính giữ nhiệt vàng ấm trên mặt quầy: "Khách rất hay gọi thêm からあげ棒 (xiên gà rán) hoặc 肉まん (bánh bao nóng). Khi khách nói tên món, em bấm lấy đúng món ở tủ đồ nóng nhé. Nếu thấy khách thứ hai đứng xếp hàng phía sau, hãy bấm nói 「少々お待ちください」 ngay để khách yên tâm chờ!"',
choices:[
{
t:'Nhớ mặt chữ からあげ棒 (xiên gà rán), 肉まん (bánh bao nóng) và câu 「少々お待ちください」',
r:'Tanaka gật gù: "Chỉ cần một câu 少々お待ちください đúng lúc, khách đang vội cũng bớt sốt ruột đi một nửa đấy."',
fx:{boss:6,jp:4,culture:3},
lesson:'Khi quầy đông khách, nói 少々お待ちください (Xin quý khách vui lòng chờ một chút ạ) giúp khách xếp hàng sau cảm thấy được tôn trọng và kiên nhẫn hơn.',
},
{
t:'Nhờ chị Sato chỉ mẹo gắp đồ nóng nhanh mà không làm rách giấy gói',
r:'Sato hướng dẫn tận tình: "Nghe câu からあげ棒ひとつください hay 肉まんひとつください là bấm ngay món đó trên tủ kính nhé!"',
fx:{team:5,jp:3},ally:true,
},
],
after:'Tay bạn gắp からあげ棒 và 肉まん đã thuần thục chẳng kém nhân viên lâu năm.',
},
a:{
label:'Ca sáng: Tập lấy đồ nóng & trấn an hàng chờ',
goal:4,maxMiss:3,items:[1,3],bag:true,bento:true,icRate:0.3,hot:true,queue:true,patience:38,hintDelay:4,
jp:'ホットスナックの注文と、並び列への「少々お待ちください」をこなそう。',
vi:'4 lượt khách: thêm tủ đồ nóng (からあげ棒 / 肉まん) và khách xếp hàng chờ (bấm 少々お待ちください để giảm nửa tốc độ tụt kiên nhẫn).',
},
drama:{
who:'tanaka',title:'Vị khách sốt ruột giờ cao điểm',
jp:'ちょっと！急いでるんだけど、まだなの！？',
text:'Giữa ca, một vị khách mặc vest đang vội bắt tàu cau mày lớn tiếng vì phải đứng chờ bạn hâm cơm hộp và lấy bánh bao nóng cho người phía trước: "Này! Tôi đang vội lắm, còn lâu nữa không?!"',
choices:[
{
t:'Giữ bình tĩnh, cúi đầu nói rõ 「大変お待たせいたしました！」 rồi thao tác thật chuẩn xác',
r:'Thấy bạn lịch sự và thao tác gọn gàng không sai một đồng tiền thừa, vị khách dịu giọng: "Ừ, cảm ơn cậu nhé." Tanaka đứng sau khen bạn xử lý rất chuyên nghiệp.',
fx:{boss:7,jp:4,culture:4,mental:1},ally:true,
lesson:'Trước khách hàng đang vội hoặc cáu gắt, nhân viên Nhật luôn giữ bình tĩnh và dùng câu kính ngữ 大変お待たせいたしました (Xin lỗi vì đã để quý khách phải chờ lâu ạ).',
},
{
t:'Cuống quýt làm thật nhanh cho xong nhưng tay run nên bấm nhầm phím trên máy',
r:'Càng luống cuống lại càng mất thêm thời gian sửa lại hoá đơn. Chị Sato phải chạy sang đỡ lời giúp bạn.',
fx:{boss:-3,mental:-4,team:2},
},
{
t:'Cãi lại rằng mình chỉ có hai tay và khách đến sau thì phải đợi theo thứ tự',
r:'Vị khách tức giận bỏ hàng xuống quầy đi thẳng. Tanaka phải ra cúi đầu xin lỗi và nhắc nhở bạn nghiêm khắc.',
fx:{boss:-9,mental:-5},watch:true,
},
],
},
b:{
label:'Ca chiều: Đồ nóng và hàng chờ nối đuôi',
goal:6,limit:190,maxMiss:3,items:[1,4],bag:true,bento:true,icRate:0.3,hot:true,queue:true,patience:34,hintDelay:4,
jp:'ホットスナックの追加と並んでいるお客さんへの声かけを忘れずに！',
vi:'6 lượt khách trong 190 giây, 1–4 món, có đồ nóng và khách xếp hàng chờ, tối đa 3 lỗi.',
},
},
{
story:{
who:'tanaka',title:'Cách trả tiền lẻ lấy xu chẵn của người Nhật',
jp:'お会計が503円のとき、1,003円出すお客さんがいる。お釣りは500円玉1枚で済むんだ！',
text:'Sáng ngày thứ 5, Tanaka chỉ cho bạn một thói quen rất thú vị của khách Nhật: "Khi hoá đơn lẻ như 503円, nhiều khách sẽ đưa tờ 1.000円 kèm thêm 3円 tiền xu thành 1.003円. Nhờ vậy em chỉ cần thối đúng 1 đồng 500円 chẵn thay vì một vốc xu lẻ! Hãy nhìn kỹ dòng khách đưa và số tiền thừa trên máy nhé."',
choices:[
{
t:'Gật đầu thích thú: "Hay quá, vậy 1.003円 trừ 503円 là thối chẵn 500円 luôn!"',
r:'Tanaka cười lớn: "Đúng thế! Hôm nay ca trưa đông khách nhất tuần, em đứng quầy chính cùng Sato nhé!"',
fx:{boss:6,jp:4,culture:5,mental:2},
lesson:'Người Nhật thường đưa thêm tiền xu lẻ (ví dụ hoá đơn 503円 đưa 1.003円) để nhận lại đồng 500円 hoặc tờ tiền chẵn, giúp ví không bị nặng vì quá nhiều xu nhỏ.',
},
{
t:'Tập bấm thử các mệnh giá 500 · 100 · 50 · 10 · 5 · 1 trên bảng thu ngân cho thật nhạy',
r:'Chị Sato cổ vũ: "Ghép tiền thừa ít đồng nhất vừa nhanh cho khách vừa được tính điểm thối tiền gọn đấy!"',
fx:{team:5,boss:4},ally:true,
},
],
after:'Khép lại tuần đầu ở サクラマート, bạn đã tự tin mỉm cười chào khách bằng tiếng Nhật.',
},
a:{
label:'Ca sáng: Làm quen khách trả tiền lẻ kiểu Nhật',
goal:5,maxMiss:3,items:[1,4],bag:true,bento:true,icRate:0.3,hot:true,queue:true,oddChange:true,patience:36,hintDelay:4,
jp:'端数を合わせて出すお客さんのお釣りを素早く計算しよう。',
vi:'5 lượt khách: đủ mọi tình huống (cơm hộp, đồ nóng, hỏi túi, hàng chờ) và có khách đưa tiền lẻ kiểu Nhật.',
},
drama:{
who:'sato',title:'Giờ cao điểm buổi trưa tại サクラマート',
jp:'お昼のピークが来るわよ！深呼吸して、一人ずつ丁寧に対応しましょう！',
text:'Đúng 12 giờ trưa, nhân viên văn phòng và công nhân quanh phố ùa vào サクラマート mua cơm hộp, cà phê và gà rán nóng. Chuông cửa tự động kêu ngân nga liên hồi, trước quầy lúc nào cũng có người đứng chờ.',
choices:[
{
t:'Hít sâu giữ nhịp: nói 少々お待ちください với khách chờ, quét hàng và thối tiền thật dứt khoát',
r:'Hai quầy của bạn và chị Sato phối hợp ăn ý như máy chạy. Cửa hàng trưởng Tanaka đứng nhìn mà nở nụ cười tự hào.',
fx:{boss:7,team:6,mental:3,jp:3},ally:true,
lesson:'Bí quyết vượt qua giờ cao điểm (ピークタイム) ở konbini là giữ nhịp ổn định: chào rõ, quét chuẩn từng món, trấn an khách chờ và kiểm tiền thừa dứt khoát.',
},
{
t:'Cố làm tắt bỏ qua bước nhìn màn hình tổng tiền để chạy đua với thời gian',
r:'Tanaka kịp thời nhắc: "Đông mấy cũng phải nhìn 合計 và お釣り trên màn hình, chậm một giây còn hơn thối nhầm!"',
fx:{boss:-3,mental:-2},
},
],
},
b:{
label:'Thử thách cuối tuần: Cao điểm trưa サクラマート',
goal:7,limit:210,maxMiss:3,items:[1,4],bag:true,bento:true,icRate:0.3,hot:true,queue:true,oddChange:true,patience:32,hintDelay:4,
jp:'7人のお客さんを正確にさばこう！端数出しのお釣りにも注意だ！',
vi:'7 lượt khách trong 210 giây, 1–4 món, đủ đồ nóng, cơm hộp, hàng chờ và khách trả tiền lẻ, tối đa 3 lỗi.',
},
},
];
