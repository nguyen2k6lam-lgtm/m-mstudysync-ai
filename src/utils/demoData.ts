import { User, Subject, Lesson, Flashcard, Quiz, Deadline, StudyGroup, GroupMember, Usage } from '../types';

export const DEMO_USER: User = {
  id: 'usr_demo_101',
  fullName: 'Nguyễn Văn Minh',
  email: 'minh.nguyen@studymind.edu.vn',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  school: 'Đại học Quốc gia TP.HCM',
  major: 'Khoa học Máy tính & Kỹ thuật Phần mềm',
  academicYear: 'Năm thứ 3 (K65)',
  timezone: 'Asia/Ho_Chi_Minh',
  language: 'vi',
  plan: 'free',
  planStatus: 'active',
  createdAt: '2026-09-01T08:00:00Z',
  updatedAt: '2026-10-17T06:30:00Z',
};

export const DEMO_SUBJECTS: Subject[] = [
  {
    id: 'sub_web_01',
    ownerId: 'usr_demo_101',
    name: 'Lập trình Web nâng cao',
    code: 'CS301',
    description: 'Kiến trúc Frontend hiện đại, React 19, Server-Side Rendering, State Management và tối ưu hiệu năng web.',
    color: '#3B82F6', // Blue
    lecturer: 'TS. Trần Hoàng Nam',
    schedule: 'Thứ 3 (07:30 - 11:00)',
    progress: 68,
    lastStudiedAt: '2026-10-16T10:30:00Z',
    createdAt: '2026-09-05T08:00:00Z',
    updatedAt: '2026-10-16T10:30:00Z',
  },
  {
    id: 'sub_db_02',
    ownerId: 'usr_demo_101',
    name: 'Cơ sở dữ liệu nâng cao',
    code: 'IT202',
    description: 'Thiết kế cơ sở dữ liệu quan hệ, đánh chỉ mục Indexing, Query Optimization, Transaction ACID và NoSQL.',
    color: '#8B5CF6', // Purple
    lecturer: 'ThS. Lê Thị Ngọc Bích',
    schedule: 'Thứ 5 (13:00 - 16:30)',
    progress: 45,
    lastStudiedAt: '2026-10-14T15:20:00Z',
    createdAt: '2026-09-06T08:00:00Z',
    updatedAt: '2026-10-14T15:20:00Z',
  },
  {
    id: 'sub_mkt_03',
    ownerId: 'usr_demo_101',
    name: 'Marketing căn bản',
    code: 'MK101',
    description: 'Hành vi người tiêu dùng, nghiên cứu thị trường, chiến lược 4P, định vị thương hiệu và Marketing kỹ thuật số.',
    color: '#10B981', // Emerald
    lecturer: 'PGS.TS Nguyễn Anh Tuấn',
    schedule: 'Thứ 6 (08:00 - 11:30)',
    progress: 80,
    lastStudiedAt: '2026-10-15T09:45:00Z',
    createdAt: '2026-09-08T08:00:00Z',
    updatedAt: '2026-10-15T09:45:00Z',
  },
];

export const DEMO_LESSONS: Lesson[] = [
  {
    id: 'les_react_hooks_01',
    ownerId: 'usr_demo_101',
    subjectId: 'sub_web_01',
    title: 'Bài 05: React Hooks chuyên sâu & Quản lý State',
    lessonDate: '2026-10-14',
    classroom: 'Phòng B2-304',
    initialNotes: 'Thầy nhấn mạnh useMemo, useCallback và bài tập lớn nộp ngày 28/10.',
    audioDuration: 2450, // ~40 mins
    audioSize: 18450000,
    analysisStatus: 'completed',
    sourceType: 'audio',
    transcript: `Chào cả lớp! Hôm nay chúng ta đi sâu vào cơ chế render của React và tối ưu hiệu năng với các Hooks nâng cao.
Trước tiên, hãy nhớ rằng React re-render một component mỗi khi state hoặc props của nó thay đổi. Nếu một component con nhận một object hoặc một function làm prop từ component cha, mỗi lần component cha re-render thì reference của function đó sẽ được khởi tạo mới. Điều này làm component con bị re-render vô ích dù logic không hề đổi.

Để giải quyết, React cung cấp useCallback và useMemo. useCallback giữ nguyên tham chiếu của hàm giữa các lần re-render nếu dependencies không đổi. Còn useMemo ghi nhớ kết quả tính toán đắt đỏ. Tuy nhiên, lưu ý: đừng lạm dụng useCallback bừa bãi vì chi phí khai báo mảng dependencies đôi khi còn tốn hơn!

Về phần bài tập: Hạn cuối nộp bài tập lớn Xây dựng ứng dụng Dashboard là ngày 28 tháng 10 năm 2026 lúc 23:59 trên hệ thống LMS. Nhóm nào nộp muộn sẽ bị trừ 20% điểm. Tuần sau ngày 21/10 chúng ta sẽ có một bài kiểm tra ngắn 15 phút về Custom Hooks nhé.`,
    summary: 'Bài giảng tập trung vào cơ chế re-render trong React và giải pháp tối ưu hiệu năng thông qua useCallback và useMemo. Thầy giảng giải cách giữ nguyên function reference để tránh re-render component con không cần thiết, sự khác biệt giữa memoizing kết quả tính toán (useMemo) và memoizing hàm (useCallback). Đồng thời nhắc nhở về việc không nên lạm dụng hooks khi không cần thiết và thông báo hai hạn chót quan trọng.',
    keyPoints: [
      {
        title: 'Cơ chế re-render của React',
        content: 'Component re-render khi state hoặc props thay đổi; reference của hàm/object mới sẽ kích hoạt render lại ở component con.',
        importance: 'high',
      },
      {
        title: 'useCallback vs useMemo',
        content: 'useCallback ghi nhớ tham chiếu hàm (function reference), còn useMemo ghi nhớ giá trị trả về của phép tính phức tạp.',
        importance: 'high',
      },
      {
        title: 'Tránh tối ưu sớm (Over-optimization)',
        content: 'Chỉ áp dụng useCallback khi truyền xuống component con đã được bọc React.memo hoặc trong dependency list của hook khác.',
        importance: 'medium',
      },
      {
        title: 'Thông báo lịch kiểm tra & nộp đồ án',
        content: 'Kiểm tra 15 phút ngày 21/10 và nộp bài tập lớn Dashboard vào 28/10 lúc 23:59.',
        importance: 'high',
      },
    ],
    keywords: ['React Hooks', 'useCallback', 'useMemo', 'Re-render', 'React.memo', 'Performance', 'LMS Deadline'],
    concepts: [
      {
        term: 'Referential Equality',
        definition: 'Tính bình đẳng tham chiếu trong JavaScript; hai object hoặc function có cùng nội dung nhưng khác địa chỉ ô nhớ sẽ bị coi là khác nhau.',
        example: '(() => {}) === (() => {}) trả về false.',
        importance: 'Rất quan trọng',
      },
      {
        term: 'useCallback',
        definition: 'Hook của React trả về một version đã được memoized của callback function, chỉ thay đổi khi một trong các dependencies thay đổi.',
        example: 'const handleClick = useCallback(() => doSomething(a), [a]);',
        importance: 'Quan trọng',
      },
      {
        term: 'useMemo',
        definition: 'Hook giúp lưu trữ kết quả tính toán đắt đỏ giữa các lần render để tránh tính toán lại không cần thiết.',
        example: 'const filteredList = useMemo(() => computeExpensiveList(items), [items]);',
        importance: 'Quan trọng',
      },
    ],
    mindMap: {
      title: 'Tối ưu hiệu năng React',
      children: [
        {
          title: 'Vấn đề Re-render',
          children: [
            { title: 'State & Props thay đổi' },
            { title: 'Tạo mới Function / Object Reference' },
            { title: 'Component con re-render lãng phí' },
          ],
        },
        {
          title: 'Giải pháp Hooks',
          children: [
            { title: 'useCallback: Giữ tham chiếu hàm' },
            { title: 'useMemo: Giữ kết quả tính toán đắt đỏ' },
            { title: 'React.memo: So sánh shallow props' },
          ],
        },
        {
          title: 'Thời hạn & Đánh giá',
          children: [
            { title: 'Quiz 15 phút (21/10)' },
            { title: 'Hạn nộp Dashboard (28/10)' },
          ],
        },
      ],
    },
    createdAt: '2026-10-14T09:30:00Z',
    updatedAt: '2026-10-14T10:15:00Z',
  },
  {
    id: 'les_db_indexing_02',
    ownerId: 'usr_demo_101',
    subjectId: 'sub_db_02',
    title: 'Bài 04: B-Tree Indexing & Tối ưu hóa truy vấn SQL',
    lessonDate: '2026-10-12',
    classroom: 'Phòng A1-102',
    initialNotes: 'Cô Bích giải thích cấu trúc cây B-Tree và B+Tree trong PostgreSQL.',
    audioDuration: 3100,
    audioSize: 22800000,
    analysisStatus: 'completed',
    sourceType: 'audio',
    transcript: `Hôm nay chúng ta tìm hiểu vì sao một câu truy vấn SELECT có thể chạy từ 5 giây giảm xuống còn 5 mili-giây nhờ Indexing.
Cơ sở dữ liệu quan hệ như PostgreSQL hay MySQL thường dùng cấu trúc B+Tree làm index mặc định. Trong B+Tree, toàn bộ dữ liệu thực tế (hoặc con trỏ tới row) đều nằm ở các Node lá (Leaf Nodes), còn các node phía trên chỉ đóng vai trò dẫn hướng tìm kiếm. Điều này giúp độ phức tạp tìm kiếm đạt O(log N).

Tuy nhiên, có một nguyên lý vàng: Index không miễn phí! Càng tạo nhiều index thì câu lệnh SELECT càng nhanh, nhưng các thao tác INSERT, UPDATE, DELETE sẽ bị chậm lại đáng kể vì hệ quản trị cơ sở dữ liệu phải cập nhật lại cây Index mỗi lần thêm dữ liệu.

Các em hãy chú ý: Hạn chót nộp bài tập phân tích Explain Plan là ngày 25/10/2026.`,
    summary: 'Phân tích nguyên lý hoạt động của cấu trúc dữ liệu B+Tree trong chỉ mục cơ sở dữ liệu quan hệ. Giải thích tại sao index tăng tốc truy vấn SELECT lên O(log N) nhưng đồng thời tạo overhead chi phí cho các câu lệnh ghi (INSERT/UPDATE/DELETE). Nhắc nhở hạn nộp bài tập thực hành Explain Plan vào 25/10.',
    keyPoints: [
      {
        title: 'Cấu trúc B+Tree',
        content: 'Tất cả dữ liệu hoặc pointer nằm ở node lá; các node trung gian giúp phân nhánh tìm kiếm logarit.',
        importance: 'high',
      },
      {
        title: 'Đánh đổi giữa Đọc và Ghi (Read vs Write)',
        content: 'Chỉ đánh index trên các cột thường xuyên xuất hiện trong mệnh đề WHERE, JOIN, ORDER BY.',
        importance: 'high',
      },
      {
        title: 'Sử dụng EXPLAIN ANALYZE',
        content: 'Dùng lệnh EXPLAIN để kiểm tra xem PostgreSQL dùng Seq Scan (quét toàn bộ) hay Index Scan.',
        importance: 'medium',
      },
    ],
    keywords: ['B+Tree', 'Index', 'PostgreSQL', 'Seq Scan', 'Index Scan', 'EXPLAIN ANALYZE', 'Query Cost'],
    concepts: [
      {
        term: 'B+Tree Index',
        definition: 'Cấu trúc cây tự cân bằng trong đó tất cả các khóa và dữ liệu được lưu ở các node lá có liên kết chuỗi.',
        example: 'CREATE INDEX idx_users_email ON users(email);',
        importance: 'Cốt lõi',
      },
      {
        term: 'Seq Scan (Sequential Scan)',
        definition: 'Quét tuần tự từng dòng của toàn bảng khi bảng chưa có index phù hợp hoặc bảng quá nhỏ.',
        importance: 'Quan trọng',
      },
    ],
    mindMap: {
      title: 'Chỉ mục & Tối ưu SQL',
      children: [
        {
          title: 'Cơ chế B+Tree',
          children: [
            { title: 'Node dẫn hướng' },
            { title: 'Node lá chứa dữ liệu' },
            { title: 'Độ phức tạp O(log N)' },
          ],
        },
        {
          title: 'Chi phí đánh đổi',
          children: [
            { title: 'Tăng tốc độ SELECT' },
            { title: 'Làm chậm INSERT / UPDATE / DELETE' },
            { title: 'Tốn dung lượng đĩa' },
          ],
        },
        {
          title: 'Deadline',
          children: [{ title: 'Nộp bài Explain Plan (25/10)' }],
        },
      ],
    },
    createdAt: '2026-10-12T14:00:00Z',
    updatedAt: '2026-10-12T15:00:00Z',
  },
];

export const DEMO_FLASHCARDS: Flashcard[] = [
  {
    id: 'fc_01',
    ownerId: 'usr_demo_101',
    subjectId: 'sub_web_01',
    lessonId: 'les_react_hooks_01',
    front: 'useCallback dùng để làm gì trong React?',
    back: 'useCallback trả về một hàm đã được ghi nhớ tham chiếu (memoized callback), giúp tránh việc tạo hàm mới ở mỗi lần re-render, ngăn chặn re-render không cần thiết ở component con.',
    example: 'const handleClick = useCallback(() => { ... }, [dependencies]);',
    difficulty: 'medium',
    topic: 'React Hooks',
    reviewStatus: 'learning',
    correctCount: 4,
    incorrectCount: 1,
    createdAt: '2026-10-14T10:20:00Z',
    updatedAt: '2026-10-16T08:00:00Z',
  },
  {
    id: 'fc_02',
    ownerId: 'usr_demo_101',
    subjectId: 'sub_web_01',
    lessonId: 'les_react_hooks_01',
    front: 'Sự khác biệt cốt lõi giữa useMemo và useCallback là gì?',
    back: 'useMemo ghi nhớ KẾT QUẢ của hàm (computed value), còn useCallback ghi nhớ CHÍNH BẢN THÂN HÀM (function instance). Thực tế useCallback(fn, deps) tương đương useMemo(() => fn, deps).',
    example: 'const val = useMemo(() => calc(x), [x]); vs const fn = useCallback(() => calc(x), [x]);',
    difficulty: 'medium',
    topic: 'React Hooks',
    reviewStatus: 'mastered',
    correctCount: 6,
    incorrectCount: 0,
    createdAt: '2026-10-14T10:20:00Z',
    updatedAt: '2026-10-16T08:00:00Z',
  },
  {
    id: 'fc_03',
    ownerId: 'usr_demo_101',
    subjectId: 'sub_db_02',
    lessonId: 'les_db_indexing_02',
    front: 'Tại sao không nên tạo Index trên tất cả các cột của bảng CSDL?',
    back: 'Vì mỗi index làm tăng dung lượng đĩa và đặc biệt làm chậm nghiêm trọng các thao tác INSERT, UPDATE, DELETE do hệ quản trị CSDL phải duy trì và cân bằng lại cây chỉ mục cho mỗi thay đổi.',
    difficulty: 'easy',
    topic: 'Database Optimization',
    reviewStatus: 'mastered',
    correctCount: 5,
    incorrectCount: 0,
    createdAt: '2026-10-12T15:10:00Z',
    updatedAt: '2026-10-15T09:00:00Z',
  },
  {
    id: 'fc_04',
    ownerId: 'usr_demo_101',
    subjectId: 'sub_db_02',
    lessonId: 'les_db_indexing_02',
    front: 'Độ phức tạp tìm kiếm của chỉ mục B+Tree là bao nhiêu?',
    back: 'O(log N), trong đó N là số lượng bản ghi hoặc key trong cây.',
    difficulty: 'easy',
    topic: 'Data Structures',
    reviewStatus: 'learning',
    correctCount: 2,
    incorrectCount: 1,
    createdAt: '2026-10-12T15:10:00Z',
    updatedAt: '2026-10-15T09:00:00Z',
  },
  {
    id: 'fc_05',
    ownerId: 'usr_demo_101',
    subjectId: 'sub_mkt_03',
    front: 'Mô hình Marketing 4P truyền thống bao gồm những yếu tố nào?',
    back: 'Product (Sản phẩm), Price (Giá cả), Place (Phân phối/Địa điểm), và Promotion (Chiêu thị/Khuyến mãi).',
    example: 'Áp dụng cho sản phẩm cà phê đóng chai Highlands.',
    difficulty: 'easy',
    topic: 'Marketing Strategy',
    reviewStatus: 'mastered',
    correctCount: 8,
    incorrectCount: 0,
    createdAt: '2026-10-10T09:00:00Z',
    updatedAt: '2026-10-15T09:00:00Z',
  },
];

export const DEMO_QUIZZES: Quiz[] = [
  {
    id: 'quiz_web_01',
    ownerId: 'usr_demo_101',
    subjectId: 'sub_web_01',
    lessonId: 'les_react_hooks_01',
    title: 'Kiểm tra nhanh: React Hooks & Re-render Optimization',
    difficulty: 'medium',
    questions: [
      {
        question: 'Khi nào một React component mặc định sẽ kích hoạt re-render?',
        options: [
          'Chỉ khi URL trình duyệt thay đổi',
          'Khi State hoặc Props của chính nó hoặc component cha thay đổi',
          'Chỉ khi người dùng nhấn chuột vào màn hình',
          'Mỗi 5 giây theo chu kỳ timer của JavaScript',
        ],
        correctAnswer: 1,
        explanation: 'React kích hoạt re-render khi state cục bộ thay đổi hoặc khi nhận props mới từ component cha.',
        difficulty: 'easy',
      },
      {
        question: 'Cú pháp useCallback(fn, deps) thực chất tương đương với cú pháp nào dưới đây?',
        options: [
          'useMemo(() => fn, deps)',
          'useEffect(fn, deps)',
          'useRef(fn).current',
          'useState(fn)[0]',
        ],
        correctAnswer: 0,
        explanation: 'useCallback trả về chính hàm fn đã được memoize, nên useCallback(fn, deps) tương đương useMemo(() => fn, deps).',
        difficulty: 'medium',
      },
      {
        question: 'Tác dụng phụ tiềm ẩn khi lạm dụng useCallback ở khắp mọi nơi là gì?',
        options: [
          'Làm ứng dụng bị lỗi SyntaxError',
          'Chi phí tạo mảng dependencies và so sánh tham chiếu có thể làm giảm hiệu năng hơn cả re-render đơn giản',
          'Làm mất tính năng responsive trên mobile',
          'Làm cho React không còn nhận được sự kiện bàn phím',
        ],
        correctAnswer: 1,
        explanation: 'Khai báo useCallback tạo thêm overhead bộ nhớ và so sánh deps; chỉ nên dùng khi component con thực sự tốn chi phí re-render và đã được bọc React.memo.',
        difficulty: 'hard',
      },
      {
        question: 'Thời hạn nộp bài tập lớn Dashboard được công bố trong bài giảng là khi nào?',
        options: [
          '20/10/2026',
          '21/10/2026',
          '25/10/2026',
          '28/10/2026 lúc 23:59',
        ],
        correctAnswer: 3,
        explanation: 'Giảng viên đã nhắc rõ hạn chót nộp bài tập lớn Dashboard là ngày 28/10/2026 lúc 23:59 trên LMS.',
        difficulty: 'easy',
      },
    ],
    createdAt: '2026-10-14T10:30:00Z',
  },
];

export const DEMO_DEADLINES: Deadline[] = [
  {
    id: 'dl_01',
    ownerId: 'usr_demo_101',
    subjectId: 'sub_web_01',
    title: 'Kiểm tra ngắn 15 phút: Custom Hooks',
    description: 'Làm bài trắc nghiệm và code nhanh 1 custom hook useDebounce trên lớp.',
    type: 'exam',
    dueDate: '2026-10-21',
    dueTime: '08:00',
    priority: 'high',
    status: 'todo',
    sourceType: 'ai_transcript',
    sourceId: 'les_react_hooks_01',
    sourceText: 'Tuần sau ngày 21/10 chúng ta sẽ có một bài kiểm tra ngắn 15 phút về Custom Hooks nhé.',
    aiConfidence: 0.95,
    isAiSuggested: false,
    reminderSettings: { remind1Day: true, remind3Days: true, remindDueDay: true },
    checklist: [
      { id: 'c1', text: 'Ôn tập kiến thức useEffect & useRef', done: true },
      { id: 'c2', text: 'Code thử hook useDebounce và useLocalStorage', done: false },
    ],
    createdAt: '2026-10-14T10:25:00Z',
    updatedAt: '2026-10-14T10:25:00Z',
  },
  {
    id: 'dl_02',
    ownerId: 'usr_demo_101',
    subjectId: 'sub_db_02',
    title: 'Nộp bài tập thực hành: Phân tích Explain Plan',
    description: 'Chạy EXPLAIN ANALYZE trên cơ sở dữ liệu bán hàng với 100,000 dòng và so sánh tốc độ.',
    type: 'assignment',
    dueDate: '2026-10-25',
    dueTime: '23:59',
    priority: 'medium',
    status: 'in_progress',
    sourceType: 'ai_transcript',
    sourceId: 'les_db_indexing_02',
    sourceText: 'Hạn chót nộp bài tập phân tích Explain Plan là ngày 25/10/2026.',
    aiConfidence: 0.92,
    isAiSuggested: false,
    reminderSettings: { remind1Day: true, remind3Days: true, remindDueDay: true },
    checklist: [
      { id: 'c3', text: 'Cài đặt PostgreSQL và nạp dữ liệu mẫu', done: true },
      { id: 'c4', text: 'Tạo B-Tree Index trên trường email và created_at', done: true },
      { id: 'c5', text: 'Chụp ảnh màn hình so sánh Execution Time', done: false },
    ],
    createdAt: '2026-10-12T15:15:00Z',
    updatedAt: '2026-10-16T11:00:00Z',
  },
  {
    id: 'dl_03',
    ownerId: 'usr_demo_101',
    subjectId: 'sub_web_01',
    groupId: 'grp_web_k65',
    title: 'Nộp Đồ án lớn: Web Dashboard Quản lý Sinh viên',
    description: 'Nộp mã nguồn GitHub kèm video demo 5 phút và tài liệu báo cáo PDF trên hệ thống LMS.',
    type: 'project',
    dueDate: '2026-10-28',
    dueTime: '23:59',
    priority: 'urgent',
    status: 'todo',
    assigneeId: 'usr_demo_101',
    assigneeName: 'Nguyễn Văn Minh (Bạn)',
    sourceType: 'ai_transcript',
    sourceId: 'les_react_hooks_01',
    sourceText: 'Hạn cuối nộp bài tập lớn Xây dựng ứng dụng Dashboard là ngày 28 tháng 10 năm 2026 lúc 23:59.',
    aiConfidence: 0.98,
    isAiSuggested: false,
    reminderSettings: { remind1Day: true, remind3Days: true, remindDueDay: true },
    checklist: [
      { id: 'c6', text: 'Hoàn thiện giao diện Dark Mode', done: true },
      { id: 'c7', text: 'Tích hợp xác thực Authentication', done: false },
      { id: 'c8', text: 'Quay video giới thiệu tính năng sản phẩm', done: false },
    ],
    createdAt: '2026-10-14T10:25:00Z',
    updatedAt: '2026-10-16T14:20:00Z',
  },
  {
    id: 'dl_04',
    ownerId: 'usr_demo_101',
    subjectId: 'sub_mkt_03',
    title: 'Thuyết trình Case Study: Chiến dịch Marketing của VinFast',
    description: 'Thuyết trình nhóm 10 phút về chiến lược định vị thương hiệu xe điện toàn cầu.',
    type: 'presentation',
    dueDate: '2026-11-06',
    dueTime: '08:30',
    priority: 'low',
    status: 'todo',
    sourceType: 'manual',
    aiConfidence: 1,
    reminderSettings: { remind1Day: true, remind3Days: false, remindDueDay: true },
    checklist: [
      { id: 'c9', text: 'Lập slide PowerPoint nhóm', done: false },
      { id: 'c10', text: 'Phân công thành viên thuyết trình từng phần', done: false },
    ],
    createdAt: '2026-10-15T11:00:00Z',
    updatedAt: '2026-10-15T11:00:00Z',
  },
];

export const DEMO_GROUPS: StudyGroup[] = [
  {
    id: 'grp_web_k65',
    ownerId: 'usr_demo_101',
    subjectId: 'sub_web_01',
    name: 'Nhóm 04: Đồ án Web Frontend K65',
    description: 'Nhóm làm đồ án môn Lập trình Web - Dự án Xây dựng Nền tảng học tập thông minh.',
    inviteCode: 'SMIND-WEB65',
    createdAt: '2026-09-15T10:00:00Z',
  },
];

export const DEMO_GROUP_MEMBERS: GroupMember[] = [
  {
    id: 'gm_01',
    groupId: 'grp_web_k65',
    userId: 'usr_demo_101',
    fullName: 'Nguyễn Văn Minh',
    email: 'minh.nguyen@studymind.edu.vn',
    role: 'owner',
    joinedAt: '2026-09-15T10:00:00Z',
  },
  {
    id: 'gm_02',
    groupId: 'grp_web_k65',
    userId: 'usr_member_02',
    fullName: 'Trần Thị Thu Hà',
    email: 'ha.tran@studymind.edu.vn',
    role: 'admin',
    joinedAt: '2026-09-16T14:30:00Z',
  },
  {
    id: 'gm_03',
    groupId: 'grp_web_k65',
    userId: 'usr_member_03',
    fullName: 'Lê Hoàng Phong',
    email: 'phong.le@studymind.edu.vn',
    role: 'member',
    joinedAt: '2026-09-18T09:15:00Z',
  },
];

export const DEMO_USAGE: Usage = {
  id: 'usg_demo_101',
  userId: 'usr_demo_101',
  month: '2026-10',
  audioMinutes: 84, // out of 300 minutes free
  aiRequests: 38, // out of 600 requests free
  documentCount: 6,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-17T06:30:00Z',
};
