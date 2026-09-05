import { Topic, Team, RubricScores } from '../types';

export const OFFICIAL_16_TOPICS: Topic[] = [
  {
    id: 1,
    title: "Hệ thống cảnh báo lừa đảo cho người lớn tuổi",
    category: "Công nghệ & Xã hội",
    description: "Xây dựng một công cụ giúp người lớn tuổi nhận biết các cuộc gọi, tin nhắn hoặc nội dung có dấu hiệu lừa đảo. Hệ thống có thể phân tích nội dung, cảnh báo các dấu hiệu bất thường và đề nghị người dùng xác minh trước khi chuyển tiền hoặc cung cấp thông tin. Mục tiêu là bảo vệ nhóm người dễ trở thành nạn nhân của các hình thức lừa đảo trực tuyến.",
    guidingQuestions: [
      "Làm thế nào để thiết kế giao diện và cơ chế cảnh báo đơn giản, phù hợp với thói quen sử dụng của người cao tuổi?",
      "Làm sao đảm bảo tính riêng tư dữ liệu cuộc gọi/tin nhắn của người dùng trong khi vẫn phát hiện dấu hiệu bất thường?"
    ]
  },
  {
    id: 2,
    title: "Ứng dụng mô phỏng nghề nghiệp cho học sinh",
    category: "Giáo dục & Hướng nghiệp",
    description: "Xây dựng một nền tảng cho phép học sinh trải nghiệm thử một nghề trước khi lựa chọn ngành học. Thay vì chỉ đọc mô tả nghề nghiệp, người dùng được thực hiện các nhiệm vụ mô phỏng một ngày làm việc thực tế của nghề đó và nhận đánh giá về mức độ phù hợp. Mục tiêu là giúp học sinh có cơ sở thực tế hơn khi lựa chọn ngành nghề tương lai.",
    guidingQuestions: [
      "Làm sao để các kịch bản mô phỏng vừa sinh động, vừa phản ánh đúng áp lực và yêu cầu thực tế của từng ngành nghề?",
      "Phương pháp nào để đánh giá khách quan mức độ phù hợp của học sinh sau khi hoàn thành nhiệm vụ mô phỏng?"
    ]
  },
  {
    id: 3,
    title: "Bản đồ tiếp cận cho người khuyết tật",
    category: "Cộng đồng & Tiếp cận",
    description: "Xây dựng bản đồ cung cấp thông tin về mức độ tiếp cận của các địa điểm đối với người khuyết tật, chẳng hạn như có đường dốc, thang máy, nhà vệ sinh phù hợp, lối đi cho xe lăn hay không. Người dùng có thể đánh giá và cập nhật tình trạng thực tế của địa điểm. Hệ thống giúp người khuyết tật chủ động lựa chọn nơi đến và thúc đẩy các địa điểm cải thiện khả năng tiếp cận.",
    guidingQuestions: [
      "Cơ chế nào để khuyến khích cộng đồng liên tục cập nhật và xác thực thông tin tiếp cận của các địa điểm?",
      "Giải pháp kỹ thuật nào giúp người khuyết tật (khiếm thị, vận động) tương tác với bản đồ thuận tiện nhất?"
    ]
  },
  {
    id: 4,
    title: "Trợ lý chống lãng phí thực phẩm",
    category: "Môi trường & Lối sống",
    description: "Xây dựng một ứng dụng giúp hộ gia đình theo dõi thực phẩm đang có, hạn sử dụng và gợi ý món ăn dựa trên những nguyên liệu sắp hết hạn. Hệ thống có thể nhắc người dùng sử dụng thực phẩm trước khi bị hỏng, đồng thời đề xuất cách bảo quản phù hợp. Ý tưởng hướng đến việc giảm lượng thực phẩm bị vứt bỏ và tiết kiệm chi phí sinh hoạt.",
    guidingQuestions: [
      "Làm thế nào để đơn giản hóa thao tác nhập dữ liệu thực phẩm để người dùng không cảm thấy phiền hà?",
      "Thuật toán gợi ý món ăn cần cân đối giữa nguyên liệu sắp hết hạn, sở thích ẩm thực và dinh dưỡng như thế nào?"
    ]
  },
  {
    id: 5,
    title: "Trợ lý phân loại rác thông minh",
    category: "Môi trường & AI",
    description: "Xây dựng một hệ thống giúp người dùng xác định một món đồ nên được bỏ vào loại rác nào. Người dùng có thể chụp ảnh đồ vật, hệ thống nhận diện và hướng dẫn cách phân loại hoặc xử lý. Ý tưởng hướng đến việc giải quyết tình trạng người dân muốn phân loại rác nhưng không biết một số loại rác khó xử lý nên được bỏ ở đâu.",
    guidingQuestions: [
      "Mô hình thị giác máy tính cần xử lý ra sao với các đồ vật bị biến dạng hoặc rác phức hợp nhiều chất liệu?",
      "Làm sao liên kết dữ liệu phân loại với quy định thu gom rác cụ thể theo từng địa phương tại Việt Nam?"
    ]
  },
  {
    id: 6,
    title: "Ứng dụng tìm đồ thất lạc trong trường học",
    category: "Trường học & Đời sống",
    description: "Xây dựng một nền tảng dành cho trường học để đăng tải và tìm kiếm đồ vật bị thất lạc. Người nhặt được đồ có thể đăng thông tin hoặc hình ảnh; người mất đồ có thể tìm kiếm theo địa điểm, thời gian và đặc điểm của đồ vật. Hệ thống có thể sử dụng AI để đối chiếu hình ảnh nhằm tìm ra những món đồ có khả năng giống nhau.",
    guidingQuestions: [
      "Quy trình xác minh quyền sở hữu cần được thiết kế ra sao để tránh trường hợp nhận nhầm hoặc trục lợi đồ có giá trị?",
      "Cơ chế bảo quản tập trung và bàn giao đồ vật tại trường học phối hợp với ứng dụng như thế nào?"
    ]
  },
  {
    id: 7,
    title: "Hệ thống chia sẻ đồ dùng ít sử dụng",
    category: "Kinh tế chia sẻ & Tiêu dùng",
    description: "Xây dựng một nền tảng cho phép mọi người cho mượn, trao đổi hoặc tặng những đồ vật ít sử dụng như sách, dụng cụ học tập, đồ gia dụng, thiết bị thể thao... Người có nhu cầu có thể tìm kiếm đồ vật gần mình thay vì phải mua mới. Ý tưởng vừa tiết kiệm chi phí vừa kéo dài vòng đời của sản phẩm và giảm tiêu dùng không cần thiết.",
    guidingQuestions: [
      "Làm thế nào để xây dựng hệ thống uy tín/đặt cọc để người cho mượn an tâm đồ dùng không bị hư hại?",
      "Động lực nào để người dùng duy trì việc cho mượn/chia sẻ thay vì cất giữ hoặc vứt bỏ đồ cũ?"
    ]
  },
  {
    id: 8,
    title: "Trợ lý tìm chỗ đậu xe thông minh",
    category: "Đô thị & Giao thông",
    description: "Xây dựng hệ thống giúp người điều khiển phương tiện tìm kiếm chỗ đậu xe phù hợp gần điểm đến. Hệ thống có thể sử dụng dữ liệu từ bãi đỗ xe, người dùng hoặc cảm biến để cập nhật tình trạng chỗ trống và đề xuất vị trí phù hợp. Mục tiêu là giảm thời gian tìm chỗ đậu, giảm ùn tắc và lượng nhiên liệu tiêu hao do phương tiện chạy vòng quanh tìm chỗ.",
    guidingQuestions: [
      "Giải pháp tích hợp dữ liệu thời gian thực từ các bãi xe tư nhân và công cộng với chi phí đầu tư tối ưu?",
      "Cơ chế đặt chỗ trước (reservation) và xử lý tình huống tài xế đến trễ để tránh chiếm chỗ ảo?"
    ]
  },
  {
    id: 9,
    title: "Khôi phục chân dung liệt sĩ bằng AI",
    category: "Tri ân Lịch sử & AI",
    description: "Sử dụng mô hình AI để khôi phục chân dung liệt sĩ bị hư hỏng, hoặc tạo chân dung dựa vào chân dung người thân. Ý tưởng giúp gia đình liệt sĩ có chân dung trong thời gian nhanh hơn, tiết kiệm công sức phục hồi thủ công.",
    guidingQuestions: [
      "Làm sao đảm bảo tính chân thực, tôn nghiêm và chuẩn mực đạo đức khi AI tái tạo khuôn mặt dựa trên ảnh người thân?",
      "Quy trình kiểm duyệt và xác nhận từ thân nhân gia đình liệt sĩ cần diễn ra như thế nào trước khi hoàn thiện?"
    ]
  },
  {
    id: 10,
    title: "Chatbot hỗ trợ thủ tục hành chính",
    category: "Chính quyền số & Dịch vụ công",
    description: "Chatbot hỗ trợ người dân về chi tiết các thủ tục hành chính, bao gồm: tài liệu cần chuẩn bị, cơ quan đến, quy trình xử lí,... để người dân thuận tiện hơn trong công việc.",
    guidingQuestions: [
      "Làm thế nào để chatbot cập nhật liên tục các thay đổi trong văn bản quy phạm pháp luật và biểu mẫu mới nhất?",
      "Giải pháp hạn chế hiện tượng ảo giác (hallucination) của mô hình ngôn ngữ lớn khi tư vấn các thủ tục pháp lý?"
    ]
  },
  {
    id: 11,
    title: "Ứng dụng học chữ Nôm",
    category: "Văn hóa & Ngôn ngữ học",
    description: "Chữ Nôm là một hệ thống chữ viết quan trọng trong lịch sử và văn hóa. Để giữ gìn, phổ biến và phát huy chữ Nôm thì cần ứng dụng học chữ viết. Ứng dụng có tính tương tác cao, xây dựng giống trò chơi, có các chức năng như viết chữ Nôm bằng tay, dịch câu viết bằng chữ Nôm,...",
    guidingQuestions: [
      "Ứng dụng công nghệ nhận diện chữ viết tay (OCR) cho các nét chữ Hán - Nôm trên màn hình cảm ứng ra sao?",
      "Các cơ chế trò chơi hóa (gamification) nào sẽ thu hút thế hệ trẻ chủ động tìm hiểu và gắn bó lâu dài?"
    ]
  },
  {
    id: 12,
    title: "Hệ thống gợi ý địa điểm du lịch",
    category: "Du lịch & Tối ưu lộ trình",
    description: "Dựa vào địa điểm người dùng muốn, hệ thống gọi ý sẽ tạo ra lịch trình cụ thể địa điểm theo thời gian để tối ưu thời gian và thứ tự di chuyển. Hệ thống sẽ giúp du khách trải nghiệm địa phương thuận lợi hơn, và địa phương có thể phát triển du lịch.",
    guidingQuestions: [
      "Thuật toán tối ưu hóa lộ trình cần giải quyết bài toán giao thông, giờ mở cửa và sở thích cá nhân hóa như thế nào?",
      "Làm sao để hệ thống cân bằng giữa các địa điểm nổi tiếng đông đúc với việc quảng bá các điểm di tích đặc sắc ít người biết?"
    ]
  },
  {
    id: 13,
    title: "AI Tuyên giáo",
    category: "Lý luận chính trị & Giáo dục",
    description: "Trong các môn lí luận chính trị thường có một số chủ đề khó tiếp cận, đặc biệt với sinh viên công nghệ. AI Tuyên giáo sẽ giúp giải đáp những vấn đề trên một cách trực quan, dễ hiểu, kèm ví dụ thực tế để sinh viên tất cả các ngành có thể nắm vững kiến thức lí luận chính trị. Người nhờ vào AI Tuyên giáo có thể có bản lĩnh chính trị vững vàng hơn, có thể quan sát và giải quyết các vấn đề xã hội khi có chủ nghĩa Mác-Lênin làm nền tảng tư tưởng, kim chỉ nam cho hành động.",
    guidingQuestions: [
      "Làm thế nào để AI liên hệ các nguyên lý lý luận trừu tượng với các bài toán thực tiễn của sinh viên công nghệ?",
      "Phương pháp kiểm duyệt nội dung và nguồn tư liệu chính thống để bảo đảm tính chuẩn xác tuyệt đối về tư tưởng chính trị?"
    ]
  },
  {
    id: 14,
    title: "Xây dựng tập dữ liệu ngôn ngữ các dân tộc thiểu số",
    category: "Dân tộc & Ngôn ngữ số",
    description: "Khả năng dịch thuật giữa ngôn ngữ các dân tộc thiểu số tại Việt Nam với tiếng Việt các ngôn ngữ khác còn khó khăn: từ điển chưa phổ biến, chưa có công cụ dịch tự động, chưa có tập dữ liệu các ngôn ngữ trên. Khi thu thập dữ liệu các ngôn ngữ của đồng bào dân tộc thiểu số (từ vựng, văn bản, tiếng nói,...), có thể có các mô hình dịch thuật bằng văn bản hoặc giọng nói cho những ngôn ngữ trên. Từ đây, khó khăn trong việc phổ cập tiếng Việt/ngoại ngữ cho đồng bào DTTS được cải thiện, và giao tiếp trong nhiều công việc sẽ hiệu quả hơn.",
    guidingQuestions: [
      "Phương pháp tiếp cận và thu thập dữ liệu tiếng nói, chữ viết của các dân tộc thiểu số tại các địa bàn vùng sâu vùng xa?",
      "Làm thế nào để xử lý sự đa dạng về thổ ngữ/phương ngữ trong cùng một cộng đồng dân tộc khi xây dựng mô hình AI?"
    ]
  },
  {
    id: 15,
    title: "AI phát hiện nội dung chống phá",
    category: "An ninh mạng & Truyền thông",
    description: "Sử dụng mô hình ngôn ngữ lớn nhằm phát hiện các bài đăng/bình luận có nội dung chống phá Đảng và Nhà nước, tự động có bình luận phản bác và gửi cho các cơ quan chức năng để xử lí.",
    guidingQuestions: [
      "Làm sao để phân biệt giữa các bài viết chống phá có tổ chức với những ý kiến đóng góp phản biện xã hội thiện chí?",
      "Cơ chế tự động hóa phản bác cần văn phong và lập luận như thế nào để thuyết phục dư luận mạng, tránh tạo tranh cãi tiêu cực?"
    ]
  },
  {
    id: 16,
    title: "Chatbot hỗ trợ các Phòng chức năng HCMUS",
    category: "Học đường & Dịch vụ sinh viên HCMUS",
    description: "Chatbot giải đáp sinh viên các quy định/quy trình về học vụ, tài vụ, khảo thí, công tác sinh viên… Ví dụ: chatbot hướng dẫn thủ tục xin mở lớp, quy định xét học bổng, thủ tục xin phúc khảo,...",
    guidingQuestions: [
      "Làm thế nào để đồng bộ dữ liệu giữa các phòng ban chức năng (Đào tạo, CTSV, KHTC) nhằm phản hồi nhất quán và nhanh chóng?",
      "Quy trình chuyển tiếp từ chatbot sang chuyên viên phụ trách khi sinh viên gặp các trường hợp học vụ cá biệt, phức tạp?"
    ]
  }
];

export const DEFAULT_TOPICS: Topic[] = OFFICIAL_16_TOPICS;

export const INITIAL_RUBRIC_SCORES: RubricScores = {
  topicUnderstanding: 0,
  argumentation: 0,
  feasibility: 0,
  creativity: 0,
  presentationSkills: 0,
};

// Function to randomly select 10 unique topics out of 16 for the 10 teams
export function generateRandomTeamTopicAssignment(): number[] {
  const allIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  // Fisher-Yates shuffle
  for (let i = allIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allIds[i], allIds[j]] = [allIds[j], allIds[i]];
  }
  return allIds; // First 10 for Team 1..10, last 6 are backup
}

// Initial 10 teams with 10 randomly assigned topics out of 16
const initialShuffledIds = generateRandomTeamTopicAssignment();

export const INITIAL_TEAMS: Team[] = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1,
  name: `Đội ${index + 1}`,
  topicId: initialShuffledIds[index],
  presentationScores: { ...INITIAL_RUBRIC_SCORES },
  hasPresented: false,
  presentationNotes: "",
}));
