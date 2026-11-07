/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import{CARE_DAYS,CARE_RANKS}from'./care_data.js';
import{BENTO_DAYS,BENTO_RANKS}from'./bento_data.js';
import{LOTUS_DAYS,LOTUS_RANKS}from'./lotus_data.js';
import{KONBINI_DAYS,KONBINI_RANKS}from'./konbini_data.js';
export{CARE_DAYS,CARE_RANKS,BENTO_DAYS,BENTO_RANKS,LOTUS_DAYS,LOTUS_RANKS,KONBINI_DAYS,KONBINI_RANKS};
export const JOBS={
lotus:{icon:'🪷',sector:'Nông nghiệp',name:'Thu hoạch củ sen',place:'Ruộng sen',area:'Ibaraki',jp:'蓮田',unit:'củ sen',ready:true,
desc:'Lội bùn, xịt nước áp lực cao để đào củ sen. Ibaraki là nơi trồng củ sen nhiều nhất Nhật Bản.'},
care:{icon:'👵',sector:'Điều dưỡng 介護',name:'Chăm sóc người cao tuổi',place:'Viện dưỡng lão',area:'Tokyo',jp:'介護施設',unit:'lượt chăm sóc',ready:true,
desc:'Đút ăn, lau miệng, trò chuyện với các cụ. Phải nghe hiểu tiếng Nhật và nói kính ngữ thật nhẹ nhàng.'},
site:{icon:'👷',sector:'Xây dựng 建設',name:'Vác ống thép trên giàn giáo',place:'Công trường',area:'Saitama',jp:'建設現場',unit:'bó ống thép',ready:true,
desc:'Làm việc trên cao, an toàn là trên hết. Chạy trên giàn giáo là bị đốc công mắng ngay!'},
bento:{icon:'🍱',sector:'Thực phẩm 食品',name:'Xếp cơm hộp trên băng chuyền',place:'Xưởng cơm hộp',area:'Chiba',jp:'弁当工場',unit:'hộp cơm',ready:true,
desc:'Băng chuyền không chờ ai: gắp đúng món vào hộp, đúng lúc. Vệ sinh là số một.'},
konbini:{icon:'🏪',sector:'Bán lẻ 小売',name:'Nhân viên cửa hàng tiện lợi',place:'Cửa hàng サクラマート',area:'Tokyo',jp:'コンビニ',unit:'lượt khách',ready:true,
desc:'Chào khách, quét hàng, hỏi hâm nóng, thối tiền thật nhanh và đúng. Giao tiếp là chính.'},
};
export const NPCS={
tanaka:{name:'Quản lý Tanaka',role:'Quản lý'},
hoa:{name:'Chị Hoa',role:'Phiên dịch nghiệp đoàn'},
sato:{name:'Chị Satō',role:'Đồng nghiệp'},
hung:{name:'Anh Hùng',role:'Senpai'},
tencho:{name:'Nhân viên konbini',role:'コンビニ'},
suzuki:{name:'Bà Suzuki',role:'Hàng xóm'},
clerk:{name:'Nhân viên ngân hàng',role:'銀行'},
};
export const INTRO={
who:'hoa',
text:'“Giấy tờ chị lo xong cả rồi. Mai em bắt đầu đi làm nhé. Có gì khó cứ gọi chị.”',
};
export const RANK_NEED=[0,20,50,90,140,200,265,335,410,490];
export const rankOf=(xp)=>{let r=0;while(r+1<RANK_NEED.length&&xp>=RANK_NEED[r+1])r++;return r;};
export const rankPay=(i)=>i*4000;
export const SITE_RANKS=['Vác ống thép 資材運搬','Vác sắt cây nặng','Buộc sắt 鉄筋結束','Lắp giàn giáo 足場組立','Kiểm tra giàn giáo 足場点検',
'Đóng cốp pha 型枠大工','Đổ bê tông','Đọc bản vẽ 図面を読む','Tổ trưởng 班長','Đốc công 職長'];
export const SITE_DAYS=[
{
story:{title:'Buổi sáng ở công trường',who:'tanaka',jp:'「ご安全に！朝礼を始めるぞ。」',text:'7h45 tập thể dục ラジオ体操, rồi họp KY (dự đoán nguy hiểm).',
choices:[
{t:'Đứng vào hàng, hô to 「ご安全に！」',fx:{boss:6,team:5},r:'Quản lý vỗ vai bạn: 「いい声だ！」',lesson:'KY 危険予知: trước ca, cả nhóm cùng nói ra nguy hiểm có thể gặp hôm nay.'},
{t:'Đứng cuối hàng, tranh thủ bấm điện thoại',fx:{boss:-7},r:'「おい！スマホしまえ！」 Cả hàng quay lại nhìn bạn.'},
],after:'Vác ống cả ngày, vai bạn đỏ ửng. Tối về ngủ như chết.'},
a:{goal:2,drift:0.35,pipeKinds:1,label:'Ca sáng: vác 2 bó ống'},
drama:{title:'Quên mũ bảo hộ',who:'tanaka',jp:'「おい、ヘルメットは？」',text:'Bạn vừa bước lên giàn giáo thì Quản lý gọi giật lại.',
choices:[
{t:'「すみません！すぐ被ります。もう忘れません」',fx:{boss:3,culture:3},r:'「次はないぞ。」 Quản lý gật đầu cho đi.'},
{t:'Giải thích dài rằng mình chỉ đi một chút',fx:{boss:-6},watch:true,r:'「言い訳するな！」 Từ giờ bạn bị để mắt.'},
]},
b:{goal:3,limit:75,drift:0.35,pipeKinds:1,label:'Ca chiều: kịp xe bê tông',jp:'「生コン車が来るぞ！」',vi:'Xe bê tông sắp đến, vác đủ 3 bó. Giữ thăng bằng khi đang vác!'},
},
{
story:{title:'Dây an toàn',who:'tanaka',jp:'「フルハーネス、ちゃんと掛けたか？」',text:'Trên cao 4 mét, ai cũng phải móc dây an toàn toàn thân.',
choices:[
{t:'Móc dây xong mới bước lên, chấp nhận chậm một chút',fx:{boss:6,culture:4},r:'「それでいい。急ぐより安全だ。」'},
{t:'Bỏ qua cho nhanh, chỉ vài bước thôi',fx:{boss:-8,mental:-5},r:'Quản lý kéo bạn xuống: 「死ぬぞ！」'},
],after:'Ống thép nặng hơn hôm qua, nhưng bạn đi vững hơn.'},
a:{goal:2,drift:0.45,pipeKinds:2,label:'Ca sáng: vác ống'},
drama:{title:'Bị sai vặt',who:'hung',jp:'「おい新人、ジュース買ってこい。」',text:'Anh senpai đưa bạn danh sách đồ uống của cả nhóm, không đưa tiền.',
choices:[
{t:'Đi mua, nhưng nói rõ: 「お金、後でお願いします」',fx:{mental:3,culture:3},ally:true,r:'Anh Hùng bật cười, trả tiền đủ, còn mua thêm cho bạn một chai.'},
{t:'Không dám nói, cứ trả tiền',fx:{money:-2400,mental:-5},r:'Bạn mất 2.400 ¥. Hôm sau lại bị nhờ tiếp.'},
]},
b:{goal:4,limit:85,maxMiss:2,drift:0.45,pipeKinds:2,label:'Ca chiều: không rơi ống',jp:'「落とすな！」',vi:'Rơi ống hoặc đặt sai ô quá 2 lần là bị gọi lên phê bình'},
},
{
story:{title:'Suýt nữa thì…',who:'hung',jp:'「さっき、パイプ落としそうになった？」',text:'Một bó ống trượt khỏi vai bạn, may mà không rơi xuống dưới.',
choices:[
{t:'Báo với quản lý: 「ヒヤリハットがありました」',fx:{boss:7,culture:5},r:'Quản lý ghi vào sổ, cả nhóm sửa lại chỗ để ống.',lesson:'ヒヤリハット: những lần “suýt tai nạn” phải báo để cả nhóm phòng tránh.'},
{t:'Thôi kệ, có sao đâu',fx:{mental:-3},r:'Hai hôm sau, bó ống của người khác rơi đúng chỗ đó.'},
],after:'Giờ bạn nghe được tiếng Nhật công trường rồi.'},
a:{goal:3,drift:0.50,pipeKinds:2,label:'Ca sáng: vác ống tầng 3'},
drama:{title:'Mưa thì ai trả lương?',who:'hoa',jp:'「雨の日は休みです。給料は…」',text:'Mưa to, công trường nghỉ. Bạn lo tháng này thiếu tiền gửi về.',
choices:[
{t:'Hỏi chị Hoa về tiền nghỉ do công ty (休業手当)',fx:{culture:6,money:12000},r:'Công ty phải trả tiền nghỉ. Bạn nhận thêm 12.000 ¥.',lesson:'休業手当: nghỉ vì lý do của công ty thì được trả ít nhất 60% lương.'},
{t:'Nhận làm chui cuối tuần',fx:{money:8000,health:-6,boss:-5},watch:true,r:'Thêm 8.000 ¥ nhưng mệt rã rời, và làm ngoài là vi phạm hợp đồng.'},
]},
b:{goal:4,limit:85,rain:true,walk:0.85,drift:0.50,pipeKinds:2,label:'Ca chiều: mưa, sàn trơn',jp:'「足元注意！」',vi:'Trời mưa sàn trơn, đi chậm hơn. Vác 4 bó đúng phiếu kịp giờ'},
},
{
story:{title:'Gió mạnh',who:'tanaka',jp:'「今日は風が強い。高所は要注意だ。」',text:'Dự báo có gió giật trên cao.',
choices:[
{t:'Hỏi lại: 「風が強いときは、止まればいいですか」',fx:{boss:5,culture:3},r:'「そうだ。迷ったら止まれ。」'},
{t:'“Có gió tí thôi, làm luôn cho xong”',fx:{boss:-4},r:'「お前、命いらないのか！」'},
],after:'Một ngày dài nữa đã qua.'},
a:{goal:3,drift:0.52,pipeKinds:3,label:'Ca sáng: chuẩn bị chằng buộc'},
drama:{title:'Đồng đội bị thương',who:'sato',jp:'「痛っ！指が…」',text:'Chị Satō kẹp tay vào khóa giàn giáo, ngón tay sưng tím.',
choices:[
{t:'Vẫn báo Quản lý: 「すぐ報告します」',fx:{boss:7,culture:5},ally:true,r:'Chị được đưa đi khám, tiền khám do bảo hiểm lao động trả.',lesson:'労災隠し: giấu tai nạn lao động là phạm luật. Bị thương khi làm việc thì 労災 chi trả.'},
{t:'Giúp băng và im lặng',fx:{boss:-4,mental:-4},r:'Tối đó tay chị sưng to hơn, và không ai biết để giúp.'},
]},
b:{goal:4,limit:85,wind:true,maxMiss:2,drift:0.52,pipeKinds:3,label:'Ca chiều: gió giật',jp:'「突風注意！」',vi:'Có cảnh báo gió thì đứng yên đừng đi. Nhớ nhìn phiếu 3 cỡ ống!'},
},
{
story:{title:'Đoàn kiểm tra an toàn',who:'tanaka',jp:'「今日は安全パトロールだ。全員、気を引き締めろ！」',text:'Đoàn tuần tra an toàn đến thăm công trường.',
choices:[
{t:'Kiểm tra lại dây, mũ, giày cho cả nhóm',fx:{boss:6,team:5},r:'Cả nhóm qua kiểm tra không lỗi nào.',lesson:'声かけ: nhắc nhau an toàn là văn hóa ở công trường Nhật.'},
{t:'Lo phần mình thôi',fx:{team:-3},r:'Một bạn trong nhóm bị nhắc vì quên khóa dây.'},
],after:'Một ngày dài nữa đã qua.'},
a:{goal:3,drift:0.56,pipeKinds:3,label:'Ca sáng: kiểm tra và dọn sàn'},
drama:{title:'Ống rơi trong lúc tuần tra',who:'tanaka',jp:'「今の音は何だ！」',text:'Một ống thép tuột khỏi tay bạn, rơi xuống sàn kêu rất to.',
choices:[
{t:'Dừng lại, báo ngay: 「すみません、私です。怪我はありません」',fx:{boss:7,culture:4},ally:true,r:'Đoàn kiểm tra gật đầu: báo ngay là đúng cách.'},
{t:'Coi như không có gì',fx:{boss:-6},watch:true,r:'Quản lý nhìn bạn rất lâu.'},
]},
b:{goal:5,limit:105,wind:true,maxMiss:2,drift:0.56,pipeKinds:3,label:'Thử thách cuối tuần: tuần tra an toàn',jp:'「パトロール中だ！」',vi:'5 bó, 3 cỡ ống, có gió, chỉ được sai 2 lần'},
},
];
export const EVENINGS=[
{title:'Mua đồ ở konbini',who:'tencho',place:'konbini',jp:'「お弁当、温めますか？」',text:'Mệt quá, bạn ghé konbini. Nhân viên hỏi gì đó rất nhanh.',
choices:[
{t:'「はい、お願いします」',fx:{jp:3,mental:3,money:-600},r:'Hộp cơm nóng hổi, kèm đôi đũa.',lesson:'温めますか？ = “Có hâm nóng không ạ?”'},
{t:'Gật đại rồi đi ra',fx:{money:-600},r:'Hộp cơm lạnh, không có đũa.',lesson:'Nói 「お箸ください」 để xin đũa.'},
]},
{title:'Bà Suzuki và túi rác',who:'suzuki',place:'home',jp:'「これ、燃えるゴミの日じゃないよ。」',text:'Bà hàng xóm cầm túi rác của phòng bạn, trông rất không vui.',
choices:[
{t:'「すみません！教えてください」 rồi xin lịch đổ rác',fx:{culture:5,senpai:2},r:'Bà dịu lại, đưa bạn tờ lịch đổ rác của khu.'},
{t:'Cười trừ rồi đóng cửa',fx:{culture:-2,mental:-2},r:'Hôm sau trên cửa có tờ giấy nhắc nhở.'},
]},
{title:'Gửi tiền về nhà',who:'tencho',place:'konbini',jp:'「海外送金のお支払いですね。」',text:'Mẹ nhắn em trai sắp đóng học phí. Bạn ra quầy konbini nộp tiền cho dịch vụ chuyển tiền. Trên nhóm mạng xã hội lại có người nhận chuyển phí siêu rẻ.',
choices:[
{t:'Nộp ở quầy cho dịch vụ được cấp phép, chấp nhận phí cao hơn chút',fx:{money:-1000,culture:5,mental:3},r:'Tiền về tới nhà sau hai ngày.'},
{t:'Chuyển qua người trên mạng cho rẻ',fx:{money:-8000,mental:-6},r:'Người đó chặn liên lạc. Mất trắng 8.000 ¥.'},
]},
{title:'Ôn tiếng Nhật',who:null,place:'home',jp:'「勉強しよう！」',text:'Bạn mở sổ ghi những từ học được ở công trường.',
choices:[
{t:'Ôn 30 phút trước khi ngủ',fx:{jp:4,mental:-1},r:'足場 (ashiba) giàn giáo, 安全帯 dây an toàn… nhớ thêm được vài từ.'},
{t:'Đi ngủ sớm cho khỏe',fx:{health:2},r:'Ngủ ngon, nhưng mai lại quên từ mới.'},
]},
{title:'Lời rủ rê của anh Hùng',who:'hung',place:'home',jp:'「ねえ、もっと稼げる仕事あるよ。」',text:'“Có chỗ lương gấp đôi, không cần giấy tờ. Bỏ đây đi, tuần sau anh đưa em đi.” Anh trông rất nghiêm túc.',
choices:[
{t:'Từ chối và khuyên anh đừng dính vào',fx:{culture:6,mental:4},r:'Anh Hùng im lặng một lúc rồi gật đầu.',lesson:'TTS chỉ được làm ở công ty tiếp nhận. Bỏ trốn đi làm chui là mất tư cách lưu trú.'},
{t:'“Để em nghĩ thêm”',fx:{mental:-3},r:'Cả đêm bạn trằn trọc.'},
]},
];
export const SOON_ON_PUBLIC=['konbini'];
export const DAYS_BY_JOB={site:SITE_DAYS,care:CARE_DAYS,bento:BENTO_DAYS,lotus:LOTUS_DAYS,konbini:KONBINI_DAYS};
export const RANKS_BY_JOB={site:SITE_RANKS,care:CARE_RANKS,bento:BENTO_RANKS,lotus:LOTUS_RANKS,konbini:KONBINI_RANKS};
export const daysOf=(job)=>DAYS_BY_JOB[job]||SITE_DAYS;
export const ranksOf=(job)=>RANKS_BY_JOB[job]||SITE_RANKS;
