export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface GraphChapter {
  key: string;
  order: number;
  title: string;
  summary: string;
  questions: QuizQuestion[];
}

export const GRAPH_CHAPTERS: GraphChapter[] = [
  {
    key: "chuong-1",
    order: 1,
    title: "Giới thiệu về đồ thị",
    summary: "Định nghĩa, đồ thị có hướng và vô hướng, bậc đỉnh, các cách biểu diễn.",
    questions: [
      {
        id: "c1-q1",
        prompt: "Đồ thị vô hướng được mô tả bởi cặp nào?",
        options: ["G = (V, E), cạnh không có hướng", "G = (V, E), mọi cạnh đều có trọng số", "G chỉ gồm tập đỉnh", "G chỉ gồm một chu trình"],
        answer: "G = (V, E), cạnh không có hướng",
        explanation: "Đồ thị vô hướng gồm tập đỉnh V và tập cạnh E, mỗi cạnh nối hai đỉnh mà không phân biệt chiều.",
      },
      {
        id: "c1-q2",
        prompt: "Trong đồ thị vô hướng đơn, bậc của một đỉnh là gì?",
        options: ["Số cạnh kề với đỉnh đó", "Số đỉnh của cả đồ thị", "Số thành phần liên thông", "Tổng trọng số các cạnh"],
        answer: "Số cạnh kề với đỉnh đó",
        explanation: "Bậc của đỉnh đếm số cạnh có một đầu là đỉnh đó.",
      },
      {
        id: "c1-q3",
        prompt: "Đồ thị có hướng khác đồ thị vô hướng ở điểm nào?",
        options: ["Mỗi cạnh có chiều đi", "Không có tập đỉnh", "Mọi đỉnh đều có bậc chẵn", "Không biểu diễn được bằng ma trận"],
        answer: "Mỗi cạnh có chiều đi",
        explanation: "Cạnh có hướng đi từ đỉnh này tới đỉnh kia, nên có bậc vào và bậc ra.",
      },
      {
        id: "c1-q4",
        prompt: "Ma trận kề của đồ thị vô hướng đơn, không có khuyên, thường có tính chất nào?",
        options: ["Đối xứng và đường chéo bằng 0", "Luôn là ma trận tam giác", "Mọi phần tử đều bằng 1", "Chỉ có một hàng khác 0"],
        answer: "Đối xứng và đường chéo bằng 0",
        explanation: "Cạnh {u, v} làm a[u][v] = a[v][u] = 1. Không có khuyên thì đường chéo bằng 0.",
      },
      {
        id: "c1-q5",
        prompt: "Với đồ thị thưa, cách biểu diễn nào thường tốn ít bộ nhớ hơn ma trận kề?",
        options: ["Danh sách kề", "Ma trận kề nhân đôi", "Ma trận toàn 1", "Danh sách mọi cặp đỉnh"],
        answer: "Danh sách kề",
        explanation: "Danh sách kề chỉ lưu các đỉnh thực sự kề nhau, phù hợp khi số cạnh nhỏ so với n².",
      },
    ],
  },
  {
    key: "chuong-2",
    order: 2,
    title: "Các thuật toán tìm kiếm trên đồ thị",
    summary: "DFS, BFS và ứng dụng: liên thông, đường đi, cầu, đỉnh trụ.",
    questions: [
      {
        id: "c2-q1",
        prompt: "Tìm kiếm theo chiều sâu (DFS) thường dùng cấu trúc nào?",
        options: ["Ngăn xếp, hoặc đệ quy", "Hàng đợi", "Hàng đợi ưu tiên", "Bảng băm của trọng số"],
        answer: "Ngăn xếp, hoặc đệ quy",
        explanation: "DFS đi sâu theo một nhánh rồi quay lui, đúng với ngăn xếp hoặc gọi đệ quy.",
      },
      {
        id: "c2-q2",
        prompt: "Tìm kiếm theo chiều rộng (BFS) duyệt đỉnh theo thứ tự nào?",
        options: ["Các đỉnh gần gốc trước, rồi mới xa hơn", "Đỉnh có bậc lớn nhất trước", "Theo thứ tự bảng chữ cái", "Đỉnh lá trước"],
        answer: "Các đỉnh gần gốc trước, rồi mới xa hơn",
        explanation: "BFS dùng hàng đợi nên các đỉnh cách gốc k cạnh được xét trước đỉnh cách k+1 cạnh.",
      },
      {
        id: "c2-q3",
        prompt: "Trên đồ thị vô hướng không trọng số, thuật toán nào tìm đường đi ít cạnh nhất?",
        options: ["BFS", "DFS", "Kruskal", "Tô màu tham lam"],
        answer: "BFS",
        explanation: "Lần đầu BFS gặp một đỉnh, đường đi tới đỉnh đó có số cạnh nhỏ nhất.",
      },
      {
        id: "c2-q4",
        prompt: "Một đồ thị vô hướng có 2 thành phần liên thông nghĩa là gì?",
        options: ["Có hai nhóm đỉnh, trong mỗi nhóm đi được với nhau, giữa hai nhóm không có đường", "Mọi đỉnh đều kề nhau", "Đồ thị có đúng 2 cạnh", "Đồ thị là một cây"],
        answer: "Có hai nhóm đỉnh, trong mỗi nhóm đi được với nhau, giữa hai nhóm không có đường",
        explanation: "Thành phần liên thông là nhóm đỉnh tối đa mà mọi cặp đều có đường đi.",
      },
      {
        id: "c2-q5",
        prompt: "Cạnh cầu của đồ thị vô hướng là cạnh nào?",
        options: ["Cạnh mà khi bỏ đi thì số thành phần liên thông tăng", "Cạnh có trọng số lớn nhất", "Cạnh nối một đỉnh với chính nó", "Cạnh nằm trên mọi chu trình"],
        answer: "Cạnh mà khi bỏ đi thì số thành phần liên thông tăng",
        explanation: "Cầu là cạnh then chốt: xóa nó làm đồ thị mất liên thông ở chỗ đó.",
      },
    ],
  },
  {
    key: "chuong-3",
    order: 3,
    title: "Đồ thị Euler và đồ thị Hamilton",
    summary: "Đường đi, chu trình Euler và Hamilton cùng điều kiện tồn tại.",
    questions: [
      {
        id: "c3-q1",
        prompt: "Chu trình Euler đi qua cái gì đúng một lần rồi quay về đỉnh xuất phát?",
        options: ["Mỗi cạnh", "Mỗi đỉnh", "Mỗi thành phần liên thông", "Mỗi mặt của đồ thị phẳng"],
        answer: "Mỗi cạnh",
        explanation: "Euler quan tâm tới cạnh. Hamilton mới là đi qua mỗi đỉnh đúng một lần.",
      },
      {
        id: "c3-q2",
        prompt: "Đồ thị vô hướng liên thông có chu trình Euler khi nào?",
        options: ["Mọi đỉnh đều có bậc chẵn", "Mọi đỉnh đều có bậc lẻ", "Có đúng một đỉnh bậc lẻ", "Có ít nhất một chu trình Hamilton"],
        answer: "Mọi đỉnh đều có bậc chẵn",
        explanation: "Đồ thị vô hướng liên thông có chu trình Euler khi và chỉ khi mọi bậc đều chẵn.",
      },
      {
        id: "c3-q3",
        prompt: "Đường đi Hamilton là đường đi nào?",
        options: ["Đi qua mỗi đỉnh đúng một lần", "Đi qua mỗi cạnh đúng một lần", "Đường đi ngắn nhất", "Đường đi chỉ gồm cầu"],
        answer: "Đi qua mỗi đỉnh đúng một lần",
        explanation: "Hamilton xét đỉnh, không yêu cầu đi hết mọi cạnh.",
      },
      {
        id: "c3-q4",
        prompt: "Đồ thị vô hướng liên thông có đúng hai đỉnh bậc lẻ thì có gì?",
        options: ["Có đường đi Euler, xuất phát ở một đỉnh bậc lẻ và kết thúc ở đỉnh kia", "Có chu trình Euler", "Không liên thông", "Là đồ thị hai phía"],
        answer: "Có đường đi Euler, xuất phát ở một đỉnh bậc lẻ và kết thúc ở đỉnh kia",
        explanation: "Hai đỉnh bậc lẻ chính là hai đầu của đường đi Euler.",
      },
      {
        id: "c3-q5",
        prompt: "Khẳng định nào đúng?",
        options: ["Đồ thị có chu trình Euler chưa chắc có chu trình Hamilton", "Mọi đồ thị liên thông đều là đồ thị Hamilton", "Mọi đồ thị Hamilton đều có mọi bậc chẵn", "DFS luôn tìm được chu trình Hamilton"],
        answer: "Đồ thị có chu trình Euler chưa chắc có chu trình Hamilton",
        explanation: "Hai khái niệm độc lập: đi hết cạnh không suy ra đi hết đỉnh đúng một lần theo một chu trình.",
      },
    ],
  },
  {
    key: "chuong-4",
    order: 4,
    title: "Đồ thị phẳng và đồ thị hai phía",
    summary: "Vẽ không cắt cạnh, đồ thị hai phía và cách nhận biết.",
    questions: [
      {
        id: "c4-q1",
        prompt: "Đồ thị phẳng là đồ thị nào?",
        options: ["Vẽ được trên mặt phẳng sao cho các cạnh không cắt nhau ngoài đỉnh", "Mọi bậc đều bằng nhau", "Có trọng số dương", "Chỉ có một chu trình"],
        answer: "Vẽ được trên mặt phẳng sao cho các cạnh không cắt nhau ngoài đỉnh",
        explanation: "Phẳng nói về cách vẽ, không phải về trọng số.",
      },
      {
        id: "c4-q2",
        prompt: "Đồ thị nào sau đây không phẳng?",
        options: ["K5", "Một cây bất kỳ", "Một chu trình độ dài 4", "Một đường đi"],
        answer: "K5",
        explanation: "K5 và K3,3 là hai đồ thị không phẳng kinh điển. Cây và chu trình C4 đều phẳng.",
      },
      {
        id: "c4-q3",
        prompt: "Đồ thị hai phía có tính chất nào?",
        options: ["Tập đỉnh chia thành hai phần, mọi cạnh chỉ nối giữa hai phần", "Mọi cạnh nối hai đỉnh trong cùng một phần", "Có đúng hai cạnh", "Mọi đỉnh bậc chẵn"],
        answer: "Tập đỉnh chia thành hai phần, mọi cạnh chỉ nối giữa hai phần",
        explanation: "Không có cạnh nào nằm trọn trong một phần.",
      },
      {
        id: "c4-q4",
        prompt: "Đồ thị vô hướng là đồ thị hai phía khi nào?",
        options: ["Không có chu trình độ dài lẻ", "Có chu trình độ dài 3", "Là đồ thị đầy đủ K3", "Có một đỉnh bậc lẻ"],
        answer: "Không có chu trình độ dài lẻ",
        explanation: "Chu trình lẻ buộc hai đỉnh kề nhau cùng một phía, nên không tô được bằng hai phía.",
      },
      {
        id: "c4-q5",
        prompt: "Một ứng dụng trực tiếp của đồ thị hai phía là gì?",
        options: ["Phân công việc cho người, mỗi cạnh là một khả năng làm được", "Tìm chu trình Euler", "Tính định thức ma trận", "Tô màu bản đồ bằng 4 màu"],
        answer: "Phân công việc cho người, mỗi cạnh là một khả năng làm được",
        explanation: "Một phía là người, một phía là việc; cạnh biểu diễn sự phù hợp.",
      },
    ],
  },
  {
    key: "chuong-5",
    order: 5,
    title: "Đồ thị màu",
    summary: "Tô màu đỉnh, sắc số và một số thuật toán tô màu.",
    questions: [
      {
        id: "c5-q1",
        prompt: "Tô màu đỉnh hợp lệ yêu cầu điều gì?",
        options: ["Hai đỉnh kề nhau phải khác màu", "Mọi đỉnh cùng màu", "Hai đỉnh không kề phải khác màu", "Mỗi cạnh một màu giống đỉnh"],
        answer: "Hai đỉnh kề nhau phải khác màu",
        explanation: "Ràng buộc chỉ đặt trên các cặp đỉnh có cạnh nối.",
      },
      {
        id: "c5-q2",
        prompt: "Sắc số của đồ thị là gì?",
        options: ["Số màu ít nhất để tô màu đỉnh hợp lệ", "Số cạnh", "Số chu trình", "Bậc lớn nhất cộng một, luôn đúng với mọi đồ thị"],
        answer: "Số màu ít nhất để tô màu đỉnh hợp lệ",
        explanation: "Sắc số là số màu nhỏ nhất, không phải một cách tô bất kỳ.",
      },
      {
        id: "c5-q3",
        prompt: "Đồ thị hai phía khác rỗng có sắc số bằng bao nhiêu?",
        options: ["2", "1", "3", "Bằng số đỉnh"],
        answer: "2",
        explanation: "Mỗi phía một màu. Nếu có cạnh thì không thể dùng 1 màu.",
      },
      {
        id: "c5-q4",
        prompt: "Thuật toán tô màu tham lam có thể làm gì?",
        options: ["Tô hợp lệ nhưng chưa chắc dùng số màu ít nhất", "Luôn ra sắc số đúng", "Chỉ chạy trên cây", "Bỏ qua các đỉnh bậc 1"],
        answer: "Tô hợp lệ nhưng chưa chắc dùng số màu ít nhất",
        explanation: "Tham lam cho một cách tô đúng, số màu phụ thuộc thứ tự xét đỉnh.",
      },
      {
        id: "c5-q5",
        prompt: "Xếp lịch thi sao cho hai môn có chung thí sinh không trùng giờ tương ứng với bài toán nào?",
        options: ["Tô màu đỉnh", "Luồng cực đại", "Cây khung nhỏ nhất", "Chu trình Euler"],
        answer: "Tô màu đỉnh",
        explanation: "Mỗi môn là một đỉnh, cạnh nối hai môn xung đột, mỗi màu là một ca thi.",
      },
    ],
  },
  {
    key: "chuong-6",
    order: 6,
    title: "Bài toán tìm đường đi ngắn nhất",
    summary: "Dijkstra, Bellman–Ford và Floyd.",
    questions: [
      {
        id: "c6-q1",
        prompt: "Thuật toán Dijkstra dùng khi nào?",
        options: ["Trọng số cạnh không âm", "Có chu trình trọng số âm", "Đồ thị không có cạnh", "Chỉ trên đồ thị vô hướng đầy đủ"],
        answer: "Trọng số cạnh không âm",
        explanation: "Dijkstra dựa trên việc khoảng cách đã chốt không bị giảm nữa, điều này đúng khi không có trọng số âm.",
      },
      {
        id: "c6-q2",
        prompt: "Bellman–Ford làm được việc gì mà Dijkstra thông thường không làm?",
        options: ["Xử lý trọng số âm và phát hiện chu trình âm", "Chỉ chạy trên cây", "Tìm chu trình Hamilton", "Tô màu đồ thị"],
        answer: "Xử lý trọng số âm và phát hiện chu trình âm",
        explanation: "Sau khi nới lặp đủ số lần, nếu vẫn nới được thì có chu trình âm chạm tới được.",
      },
      {
        id: "c6-q3",
        prompt: "Thuật toán Floyd tính gì?",
        options: ["Đường đi ngắn nhất giữa mọi cặp đỉnh", "Một cây khung nhỏ nhất", "Luồng cực đại", "Sắc số"],
        answer: "Đường đi ngắn nhất giữa mọi cặp đỉnh",
        explanation: "Floyd điền bảng khoảng cách cho tất cả các cặp, thường bằng quy hoạch động.",
      },
      {
        id: "c6-q4",
        prompt: "Nếu đồ thị có chu trình âm chạm tới được từ đỉnh nguồn thì sao?",
        options: ["Không có đường đi ngắn nhất hữu hạn tới một số đỉnh", "Dijkstra vẫn luôn đúng", "Mọi khoảng cách bằng 0", "Đồ thị không liên thông"],
        answer: "Không có đường đi ngắn nhất hữu hạn tới một số đỉnh",
        explanation: "Đi vòng mãi trên chu trình âm làm tổng trọng số giảm không giới hạn.",
      },
      {
        id: "c6-q5",
        prompt: "Trên đồ thị không trọng số, đường đi ngắn nhất theo số cạnh tìm bằng thuật toán nào là đủ?",
        options: ["BFS", "Floyd trên ma trận trọng số âm", "Kruskal", "Tô màu Welch–Powell"],
        answer: "BFS",
        explanation: "Coi mỗi cạnh dài 1 thì BFS chính là đường đi ngắn nhất.",
      },
    ],
  },
  {
    key: "chuong-7",
    order: 7,
    title: "Cây và cây khung",
    summary: "Cây, cây khung và cây khung nhỏ nhất.",
    questions: [
      {
        id: "c7-q1",
        prompt: "Một cây có n đỉnh thì có bao nhiêu cạnh?",
        options: ["n − 1", "n", "n + 1", "2n"],
        answer: "n − 1",
        explanation: "Cây liên thông và không có chu trình, nên số cạnh đúng bằng n − 1.",
      },
      {
        id: "c7-q2",
        prompt: "Cây khung của đồ thị vô hướng liên thông là gì?",
        options: ["Một đồ thị con là cây và chứa mọi đỉnh", "Một chu trình đi qua mọi cạnh", "Đường đi ngắn nhất duy nhất", "Một cách tô màu"],
        answer: "Một đồ thị con là cây và chứa mọi đỉnh",
        explanation: "Cây khung giữ liên thông với số cạnh ít nhất, không tạo chu trình.",
      },
      {
        id: "c7-q3",
        prompt: "Cây khung nhỏ nhất là cây khung nào?",
        options: ["Có tổng trọng số cạnh nhỏ nhất", "Có ít đỉnh nhất", "Có nhiều chu trình nhất", "Chỉ dùng các cạnh cầu"],
        answer: "Có tổng trọng số cạnh nhỏ nhất",
        explanation: "Bài toán MST chọn tập cạnh nối hết đỉnh với chi phí nhỏ nhất và không có chu trình.",
      },
      {
        id: "c7-q4",
        prompt: "Thuật toán nào dùng để tìm cây khung nhỏ nhất?",
        options: ["Kruskal hoặc Prim", "Floyd", "Tô màu tham lam", "Thuật toán chỉ tìm cầu"],
        answer: "Kruskal hoặc Prim",
        explanation: "Kruskal xét cạnh từ nhẹ đến nặng. Prim mọc cây từ một đỉnh.",
      },
      {
        id: "c7-q5",
        prompt: "Kruskal bỏ qua một cạnh khi nào?",
        options: ["Khi thêm cạnh đó tạo thành chu trình", "Khi cạnh đó có trọng số dương", "Khi cạnh nối hai đỉnh khác thành phần", "Khi cạnh là cạnh nhẹ nhất"],
        answer: "Khi thêm cạnh đó tạo thành chu trình",
        explanation: "Kruskal chỉ nhận cạnh nối hai đỉnh đang ở hai tập khác nhau.",
      },
    ],
  },
  {
    key: "chuong-8",
    order: 8,
    title: "Luồng cực đại",
    summary: "Mạng vận tải, lát cắt, đường tăng luồng và định lý Ford–Fulkerson.",
    questions: [
      {
        id: "c8-q1",
        prompt: "Trong mạng vận tải, luồng trên một cạnh phải thỏa điều gì?",
        options: ["Không âm và không vượt sức chứa", "Luôn bằng sức chứa", "Luôn bằng 0", "Lớn hơn sức chứa"],
        answer: "Không âm và không vượt sức chứa",
        explanation: "0 ≤ luồng(cạnh) ≤ sức chứa(cạnh).",
      },
      {
        id: "c8-q2",
        prompt: "Với mọi đỉnh không phải nguồn và đích, luồng phải thế nào?",
        options: ["Tổng luồng vào bằng tổng luồng ra", "Tổng luồng vào bằng 0", "Bậc vào bằng 1", "Không có cạnh đi ra"],
        answer: "Tổng luồng vào bằng tổng luồng ra",
        explanation: "Đó là điều kiện bảo toàn luồng tại đỉnh trung gian.",
      },
      {
        id: "c8-q3",
        prompt: "Định lý Ford–Fulkerson nói điều gì?",
        options: ["Giá trị luồng cực đại bằng sức chứa lát cắt cực tiểu", "Mọi mạng đều có chu trình Euler", "Luồng cực đại luôn bằng số đỉnh", "Không tồn tại đường tăng luồng nào ngay từ đầu"],
        answer: "Giá trị luồng cực đại bằng sức chứa lát cắt cực tiểu",
        explanation: "Max-flow min-cut: không thể đẩy thêm luồng khi lát cắt hẹp nhất đã đầy.",
      },
      {
        id: "c8-q4",
        prompt: "Đường tăng luồng là đường đi nào?",
        options: ["Đường trên đồ thị thặng dư còn có thể đẩy thêm luồng", "Đường đi Hamilton", "Cây khung nhỏ nhất", "Chu trình toàn cạnh đầy"],
        answer: "Đường trên đồ thị thặng dư còn có thể đẩy thêm luồng",
        explanation: "Đi dọc đường này cho phép tăng giá trị luồng từ nguồn tới đích.",
      },
      {
        id: "c8-q5",
        prompt: "Khi không còn đường tăng luồng, luồng hiện tại là gì?",
        options: ["Một luồng cực đại", "Luồng bằng 0", "Một cây khung", "Một cách tô màu"],
        answer: "Một luồng cực đại",
        explanation: "Thuật toán Ford–Fulkerson dừng khi không còn đường tăng, và lúc đó luồng là cực đại.",
      },
    ],
  },
];

export function chapterByKey(key: string): GraphChapter | undefined {
  return GRAPH_CHAPTERS.find((chapter) => chapter.key === key);
}

export interface PoolQuestion {
  id: string;
  question_text: string;
  options_json: string[];
  correct_answer: string;
  explanation: string;
  chapter_id: string;
}

export function localQuestionPool(): PoolQuestion[] {
  return GRAPH_CHAPTERS.flatMap((chapter) =>
    chapter.questions.map((question) => ({
      id: question.id,
      question_text: question.prompt,
      options_json: question.options,
      correct_answer: question.answer,
      explanation: question.explanation,
      chapter_id: chapter.key,
    })),
  );
}
