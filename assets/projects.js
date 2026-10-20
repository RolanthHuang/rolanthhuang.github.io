/*
  Everything the doors say lives in this file.

  - Every text has an English (en) and Traditional Chinese (zh) version.
  - To add a project: copy one object inside a room's "doors" list, give it a new id,
    and change the texts and links. A new door appears in that room by itself.
  - kind: "demo" = an open door with a live demo and source code.
          "case" = a locked door: production work you can describe but not show.
  - image: path without the extension. Put two files in assets/img:
           name.jpg (1280 x 800) and name-sm.jpg (640 x 400).
  - focus: which part of the screenshot shows through the door's little window.
  - repo:  the GitHub repository name. The "updated" date is read live from GitHub
           when the page opens; the date written here is only the fallback.
  - hall:  the name engraved on the brass plaque when this project is one of the
           four doors in the photographic hall (defaults to plate).

  The four plaques in the hall follow the repositories pinned on GitHub
  (assets/pinned.json, rewritten by .github/workflows/pinned-doors.yml).
  Empty places are filled from hall.defaults below.
*/
window.SITE = {
  person: {
    name: { en: "Yi-Hsuan Huang", zh: "黃一玄" },
    altName: { en: "黃一玄", zh: "Yi-Hsuan Huang" },
    title: { en: "Senior Risk / ML Systems Engineer", zh: "資深風控 / ML 系統工程師" },
    focus: { en: "Adversarial behavior and automated decision systems", zh: "對抗行為與自動決策系統" },
    email: "hwang.yishiuan@gmail.com",
    linkedin: "https://www.linkedin.com/in/yi-hsuan-huang-8a7b5416b/",
    github: "https://github.com/RolanthHuang",
    githubUser: "RolanthHuang",
    siteRepo: "rolanthhuang.github.io",
    cv: { en: "cv/Yi-Hsuan_Huang_CV_EN.pdf", zh: "cv/Yi-Hsuan_Huang_CV_ZH.pdf" }
  },

  rooms: [
    {
      id: "risk",
      paint: "#8E2C2C",
      wall: "#3A1B1A",
      glimpse: "#6A302C",
      plate: { en: "Risk & anomaly", zh: "風控與異常" },
      title: { en: "Risk and anomaly detection", zh: "風控與異常偵測" },
      line: {
        en: "Catching automated and coordinated behavior early, without burying the team in false alarms.",
        zh: "提早抓到自動化與協同行為，又不讓團隊被誤報淹沒。"
      },
      doors: [
        {
          id: "payment-platform",
          kind: "case",
          paint: "#6F2222",
          plate: { en: "Two-stage detection", zh: "兩階段偵測" },
          title: { en: "Two-stage anomaly detection at a payment platform", zh: "支付平台的兩階段異常偵測" },
          context: {
            en: "Senior data analyst and ML engineer (remote) at LDR, a large online payment and transaction platform, October 2025 to January 2026.",
            zh: "LDR 大型線上支付與交易平台，資深數據分析師 / ML 工程師（遠端），2025 年 10 月至 2026 年 1 月。"
          },
          lede: {
            en: "The production system stays with the client, so this door stays locked. The plaque says what it did.",
            zh: "正式系統屬於客戶，所以這扇門維持上鎖。門上的銘牌記錄它做了什麼。"
          },
          problem: {
            en: "Fake traffic, bots, proxy or spoofed devices and coordinated accounts, at production volume, with manual review as the bottleneck.",
            zh: "假流量、機器人、代理或偽造裝置、協同帳號，在正式流量規模下出現，人工審查成了瓶頸。"
          },
          method: {
            en: "Stage 1 turns behavior into time series and flags shifts with the Hurst exponent and spike detection. Stage 2 scores candidates with XGBoost and CatBoost. k-means and graph relationships connect the accounts and devices that act together, and several feature pipelines run side by side so the models keep up as behavior drifts.",
            zh: "第一階段把行為轉成時間序列，用 Hurst exponent 與 spike detection 抓轉變；第二階段用 XGBoost／CatBoost 做監督式風險評分。以 k-means 與關聯圖找出一起行動的帳號與裝置，多條特徵管線並行，讓模型跟得上行為漂移。"
          },
          result: {
            en: "Stage 1 reached 80%+ recall. Stage 2 reached 90%+ recall with 70%+ precision on production-labeled data. Model scores and rules feed real-time decisions, which cut manual review and unnecessary interventions.",
            zh: "第一階段流程層級 Recall 80%+；第二階段在 production-labeled data 上達到 Recall 90%+、Precision 70%+。模型分數與規則接入即時決策，降低人工審查負擔與不必要的誤判。"
          },
          tags: ["Python", "SQL", "Time series", "Hurst exponent", "Spike detection", "XGBoost", "CatBoost", "k-means", "Graph analysis"],
          next: "hurst-spike",
          archive: "https://www.dropbox.com/scl/fo/79dsnbmjs8pt1pm5hc9o9/AIxSXyfTG-m6CNhUq_2Gr50?rlkey=fe3qs7ngho3b83cgygbzayn5g&st=qtawt5tj&dl=0"
        },
        {
          id: "hurst-spike",
          kind: "demo",
          paint: "#A23A33",
          plate: { en: "Hurst & spike replay", zh: "Hurst 尖峰回放" },
          title: { en: "Cross-day Hurst change and spike capture", zh: "跨日 Hurst 變化與尖峰捕捉" },
          lede: {
            en: "An open version of the first detection stage, running on deterministic synthetic data.",
            zh: "第一階段偵測的公開版本，使用固定種子的模擬資料。"
          },
          problem: {
            en: "Which device types, device IDs or IPs changed the structure of their activity across days, and which pseudonymous users sat inside the bursts?",
            zh: "哪些裝置類型、裝置 ID 或 IP 的活動結構跨日改變了？突峰裡又是哪些去識別化的使用者？"
          },
          method: {
            en: "Events are bucketed into fixed-second time series per feature and UTC day. Daily Hurst exponents come from DFA, features are ranked by ΔH = max(H) − min(H), and spike windows on the top candidates give the users to review.",
            zh: "事件依特徵與 UTC 日期切成固定秒數的時間序列；以 DFA 計算每日 Hurst exponent，用 ΔH = max(H) − min(H) 排序特徵，再從候選特徵的尖峰時窗找出待審使用者。"
          },
          result: {
            en: "Two browser pages with nothing to install: an animated replay where the scan line only counts spikes it has already passed, and a static dashboard. A Python CLI with tests comes with it. The output is a risk signal to combine with rules, models and human review, never a verdict on its own.",
            zh: "兩個免安裝的瀏覽器頁面：掃描線只計入已通過尖峰的動態回放，以及靜態分析儀表板；另附 Python CLI 與測試。輸出是風險訊號，需與規則、模型、人工審查交叉驗證，不單獨作為處分依據。"
          },
          tags: ["Python", "DFA", "Hurst exponent", "Spike detection", "Synthetic data"],
          data: { en: "Synthetic data", zh: "模擬資料" },
          demo: "https://rolanthhuang.github.io/hurst-spike-risk-demo/web/hurst-spike-replay.html",
          more: [
            { label: { en: "Static dashboard", zh: "靜態分析版" }, url: "https://rolanthhuang.github.io/hurst-spike-risk-demo/web/hurst-exponent-dashboard.html" }
          ],
          repo: "hurst-spike-risk-demo",
          updated: "2026-08-28",
          image: "assets/img/hurst",
          focus: "27% 55%"
        }
      ]
    },

    {
      id: "decisions",
      paint: "#3B5A82",
      wall: "#16263A",
      glimpse: "#284364",
      plate: { en: "Decision systems", zh: "決策系統" },
      title: { en: "Multi-agent decision systems", zh: "多代理決策系統" },
      line: {
        en: "Choosing well, period after period, while many parties pull in different directions.",
        zh: "多方互相拉扯時，一期又一期做出好的決策。"
      },
      doors: [
        {
          id: "platform-risk",
          kind: "case",
          paint: "#2C4566",
          plate: { en: "Multi-platform control", zh: "跨平台風控" },
          title: { en: "Real-time risk control across many platforms", zh: "跨平台即時風控系統" },
          context: {
            en: "Risk system designer and algorithm engineer for online platforms in Taipei and Taichung, about four and a half years between 2018 and 2023, onsite, hybrid and remote.",
            zh: "2018 至 2023 年間約 4.5 年，在台北、台中的線上平台擔任風控系統設計與演算法工程師（近端、遠端、混合）。"
          },
          lede: {
            en: "These systems belong to the companies that run them, so this door stays locked. The plaque says what they did.",
            zh: "這些系統屬於營運它們的公司，所以這扇門維持上鎖。門上的銘牌記錄它們做了什麼。"
          },
          problem: {
            en: "Keep platforms stable and profitable while users act strategically, coordinate with each other and hunt for loopholes across platforms.",
            zh: "在使用者策略性行為、彼此協同、跨平台尋找漏洞的情況下，維持平台長期穩定與獲利。"
          },
          method: {
            en: "Simultaneous and sequential game models, k-means clustering of decision behavior, expansion trees with backward induction to test strategies, and automated agent strategies under probabilistic constraints. Modeling in Python, shipped with Go engineering teams.",
            zh: "同時賽局與連續賽局模型、對決策行為做 k-means 分群、以展開樹倒推驗證策略，並在機率限制下設計自動化代理策略。Python 建模，與 Go 工程團隊協作上線。"
          },
          result: {
            en: "Single- and cross-platform revenue and risk control flows, with internal design and validation workflows used by dozens of platforms and merchants. Manual monitoring fell to near zero and leadership got real-time decision views, over hundreds of small and mid-size sprints.",
            zh: "完成單平台與跨平台的收益風險控制流程，內部設計與驗證流程供數十個平台與商戶使用；人工監控需求降到接近零，管理層有可即時操作的決策視圖。期間完成上百個中小型 Sprint。"
          },
          tags: ["Game theory", "k-means", "Expansion trees", "Probabilistic modeling", "Python", "Go"],
          next: "balancing",
          archive: "https://www.dropbox.com/scl/fo/bbqcu8bydudmingg61rkw/AIO8SNby0HozL2r--bJvTzg?rlkey=b3o601ut4iuaxniwyga8lvmdj&st=lzz86dq4&dl=0"
        },
        {
          id: "balancing",
          kind: "demo",
          paint: "#4A6D99",
          plate: { en: "Cash-flow balancing", zh: "現金流平衡" },
          title: { en: "Multi-channel cash-flow balancing", zh: "多通道現金流平衡模擬" },
          lede: {
            en: "A generalized, runnable version of the decision model behind the locked door, on synthetic numbers.",
            zh: "上鎖那扇門背後決策模型的通用化、可執行版本，使用合成數字。"
          },
          problem: {
            en: "Many merchants share one decision per settlement period. An option that helps one margin can push another out of its band.",
            zh: "多個商戶共用每期一個決策；幫了一個商戶的毛利，可能把另一個推出目標區間。"
          },
          method: {
            en: "Each option is scored on stability support against risk exposure. The policy runs at a set policy application rate, with baseline sampling otherwise, and the shared result feeds back into every merchant.",
            zh: "以 Stability Support 與 Risk Exposure 為每個選項評分；依 Policy Application Rate 執行政策，其餘採基準抽樣，共同結果再回饋到所有商戶。"
          },
          result: {
            en: "A browser simulator with adjustable target margins, merchant count, option count and periods, a draggable 3D view and CSV export. A second page takes one decision cycle apart in nine stages, from the shared candidate space to the result fed back to every merchant.",
            zh: "瀏覽器模擬器：可調目標毛利、商戶數、方案數與期數，附可拖曳的 3D 圖與 CSV 匯出。另一頁把一個決策週期拆成九關，從共同候選空間一路到回饋給所有商戶的結果。"
          },
          tags: ["Python", "Simulation", "Policy search", "3D visualization"],
          data: { en: "Synthetic data", zh: "模擬資料" },
          demo: "https://rolanthhuang.github.io/realtime-multi-customer-balancing/outputs/profit_control_realtime.html",
          more: [
            { label: { en: "Decision system autopsy", zh: "決策系統逐關拆解" }, url: "https://rolanthhuang.github.io/realtime-multi-customer-balancing/outputs/algorithm-autopsy.html" }
          ],
          repo: "realtime-multi-customer-balancing",
          updated: "2026-09-14",
          image: "assets/img/balancing",
          focus: "74% 66%"
        },
        {
          id: "wanted-unwanted",
          kind: "demo",
          paint: "#5D7FA8",
          plate: { en: "Wanted / unwanted", zh: "Wanted／Unwanted" },
          title: { en: "Wanted and unwanted: choosing under risk", zh: "Wanted／Unwanted 多維度選擇" },
          lede: {
            en: "The same candidates scored twice: how much we want each one, and how much risk it carries.",
            zh: "同一組候選項打兩次分：有多想要，以及帶著多少風險。"
          },
          problem: {
            en: "The most wanted option is often the riskiest, and a single score hides that trade-off.",
            zh: "最想要的選項往往風險最高，單一分數會把這個取捨藏起來。"
          },
          method: {
            en: "Sort the wanted scores and find the cut that best separates high from low by mean squared distance. Among the candidates that pass, minimize (max wanted − wanted)² + unwanted², with ties broken at random.",
            zh: "排序 wanted 分數，以平均平方距離找出最合適的高低分群切點；在通過的候選中最小化 (max wanted − wanted)² + unwanted²，並列時隨機選出。"
          },
          result: {
            en: "A 3D view where wanted rises above the z = 0 plane and risk hangs below it, so each candidate shows both at once. The same wanted and unwanted vectors sit inside the balancing model's decision cycle. Interactive Plotly page plus a Matplotlib script.",
            zh: "3D 圖中 wanted 從 z = 0 往上、風險往下，每個候選項的兩個維度一眼可見。同樣的 wanted／unwanted 向量也在現金流平衡模型的決策週期裡。附 Plotly 互動頁與 Matplotlib 程式。"
          },
          tags: ["Python", "Plotly", "Clustering", "Multi-objective choice"],
          data: { en: "Synthetic data", zh: "模擬資料" },
          weight: { en: "About 5 MB", zh: "約 5 MB" },
          demo: "https://rolanthhuang.github.io/Multi-dimensional-choices/wanted-unwanted-interactive.html",
          repo: "Multi-dimensional-choices",
          updated: "2026-07-19",
          image: "assets/img/wanted",
          focus: "24% 40%"
        }
      ]
    },

    {
      id: "simulations",
      paint: "#A97C28",
      wall: "#2E2410",
      glimpse: "#5C4A1F",
      plate: { en: "Simulations", zh: "情境模擬" },
      title: { en: "Simulation and decision support", zh: "情境模擬與決策支援" },
      line: {
        en: "Tools for replaying what happened and rehearsing what could happen, before anyone acts on it.",
        zh: "在任何人採取行動之前，回放發生過的事、預演可能發生的事。"
      },
      doors: [
        {
          id: "market-terrain",
          kind: "demo",
          paint: "#B88A33",
          plate: { en: "Market terrain", zh: "市場地形" },
          hall: { en: "Binance 3D", zh: "市場地形" },
          title: { en: "Market terrain review", zh: "市場地形檢視" },
          context: { en: "Independent consulting project, September to October 2026.", zh: "獨立顧問專案，2026 年 9 至 10 月。" },
          lede: {
            en: "Thirty months of turnover for 60 crypto markets, drawn as terrain you can turn in your hands.",
            zh: "60 個加密貨幣市場、30 個月的成交額，畫成可以拿在手上轉動的地形。"
          },
          problem: {
            en: "Multi-strategy backtests across BTC, ETH, SOL, XRP and DOGE need a way to see where and when trading conditions held, and where they broke.",
            zh: "BTC、ETH、SOL、XRP、DOGE 的多策略回測，需要看得出交易條件在哪裡、什麼時候成立，又在哪裡失效。"
          },
          method: {
            en: "Five assets at twelve intervals, from 1 to 10 minutes plus 15 minutes and 1 hour. The surface plots date × time of day × turnover, and height can switch to turnover per minute, multiples of each market's fixed P1, or trade count. Red rings mark research gate failures, and nearby failures can be linked.",
            zh: "5 種資產 × 12 種週期（1 至 10 分鐘、15 分鐘、1 小時）。地表為「日期 × 日內時刻 × 成交額」，高度可切換為每分鐘成交額、相對固定 P1 的倍數或成交筆數；紅圈標出研究 Gate 失敗，並可連結相近的失敗事件。"
          },
          result: {
            en: "A WebGL2 research replay that loads only the market and month in view, with a 60-market candidate ranking. It never places orders. It was built alongside the project's strategy backtests and risk simulation.",
            zh: "WebGL2 研究回放工具，只載入畫面中的市場與月份，附 60 個市場的候選排名；工具不會下單。與專案的多策略回測、風險模擬一起建置。"
          },
          tags: ["Three.js / WebGL2", "Time series", "Backtesting", "Risk simulation"],
          data: { en: "Historical market data, Apr 2024 to Oct 2026", zh: "歷史市場資料，2024 年 4 月至 2026 年 10 月" },
          demo: "https://rolanthhuang.github.io/Binance_Trading_Volume_3D_Terrain_Diagram/",
          more: [
            { label: { en: "Reading guide (PDF, in Chinese)", zh: "操作與判讀說明（PDF）" }, url: "https://rolanthhuang.github.io/Binance_Trading_Volume_3D_Terrain_Diagram/docs/terrain-guide-zh-TW.pdf" }
          ],
          repo: "Binance_Trading_Volume_3D_Terrain_Diagram",
          updated: "2026-10-12",
          image: "assets/img/terrain",
          focus: "58% 52%"
        },
        {
          id: "material-planning",
          kind: "demo",
          paint: "#8C6A26",
          plate: { en: "Material planning", zh: "物料規劃" },
          title: { en: "Material planning scenario simulator", zh: "物料規劃情境模擬器" },
          context: { en: "Independent project, August 2026.", zh: "獨立專案，2026 年 8 月。" },
          lede: {
            en: "From supplier inbound to customer delivery, played out week by week on fictitious data.",
            zh: "從供應商進料到客戶交貨，用虛構資料逐週演出。"
          },
          problem: {
            en: "Shortages, shared components and late suppliers collide in the same weeks, and every allocation choice moves cost and service at once.",
            zh: "缺料、共用料件與供應延遲常撞在同幾週，每個分配決定都同時牽動成本與服務水準。"
          },
          method: {
            en: "A weekly model links supplier inbound, usable material, cross-order allocation and staged delivery, with supplier ETA confidence, rolling replanning and rush orders. Scenarios compare on-hand stock only, supplier delay with short delivery, and expedited recovery.",
            zh: "逐週模型串起供應商進料、可用物料、跨訂單分配與分段交貨，含供應商 ETA 信心、滾動重排與急單插入；情境比較僅現有庫存、供應延遲加短交、加急補救。"
          },
          result: {
            en: "Three browser pages: a static review prototype, a playable simulator with CSV export, and a rotatable 3D view of order coverage. It is an explainable decision-support prototype, not an ERP.",
            zh: "三個瀏覽器頁面：靜態審閱 prototype、可操作並匯出 CSV 的動態模擬器，以及可旋轉的 3D 訂單覆蓋視圖。定位是可解釋的決策支援 prototype，不是 ERP。"
          },
          tags: ["Scenario simulation", "Supply planning", "BOM", "3D visualization"],
          data: { en: "Fictitious data", zh: "虛構資料" },
          demo: "https://rolanthhuang.github.io/material-planning-scenario-simulator/outputs/material-planning-3d-order-containers.html",
          more: [
            { label: { en: "Playable simulator", zh: "動態模擬器" }, url: "https://rolanthhuang.github.io/material-planning-scenario-simulator/outputs/material-planning-dynamic-simulator.html" },
            { label: { en: "Static review prototype", zh: "靜態審閱版" }, url: "https://rolanthhuang.github.io/material-planning-scenario-simulator/outputs/material-planning-static-prototype.html" }
          ],
          repo: "material-planning-scenario-simulator",
          updated: "2026-08-24",
          image: "assets/img/material",
          focus: "36% 44%"
        }
      ]
    },
    {
      id: "studio",
      paint: "#2E5964",
      wall: "#14262B",
      glimpse: "#2C4B53",
      plate: { en: "3D works", zh: "3D 作品" },
      title: { en: "3D works and games", zh: "3D 作品與遊戲" },
      line: {
        en: "Worlds built for the browser: a surf break, a wooden settlement and a sea in a bottle.",
        zh: "為瀏覽器打造的小世界：一道浪、一座木造聚落、一片瓶中的海。"
      },
      doors: [
        {
          id: "sunshore",
          kind: "demo",
          paint: "#3F6D93",
          plate: { en: "Sunshore", zh: "逐浪小島" },
          title: { en: "Sunshore", zh: "逐浪小島" },
          context: { en: "Personal project, October 2026.", zh: "個人專案，2026 年 10 月。" },
          lede: {
            en: "A third-person surfing game that runs in the browser.",
            zh: "在瀏覽器裡玩的第三人稱衝浪小遊戲。"
          },
          problem: {
            en: "Make surfing feel right on a keyboard: speed has to come from the wave, not from a button.",
            zh: "讓鍵盤也能衝出手感：速度要來自浪，而不是來自按鍵。"
          },
          method: {
            en: "A and D carve while keeping the forward glide, W presses the board down for speed, Shift spends energy on a burst that recovers as you ride and carve, and Space jumps off the wave and lands back on its face. There is no countdown.",
            zh: "A／D 左右切浪並保留向前慣性，W 壓板、降低重心加速，Shift 消耗能量爆發加速、滑行與切浪時回復，Space 跳浪再落回浪面。沒有倒數。"
          },
          result: {
            en: "You set off straight from the south bay break, with a third-person camera you can turn and pull back.",
            zh: "從南灣浪線直接踩板出發，第三人稱鏡頭可以轉動、也可以拉遠。"
          },
          tags: ["three.js", "WebGL", "Browser game"],
          demo: "https://rolanthhuang.github.io/surfingisland/",
          repo: "surfingisland",
          updated: "2026-10-15",
          image: "assets/img/sunshore",
          focus: "50% 62%"
        },
        {
          id: "woodweave",
          kind: "demo",
          paint: "#7A5230",
          plate: { en: "Woodweave", zh: "木序" },
          title: { en: "Woodweave", zh: "木序" },
          context: { en: "Personal project, October 2026.", zh: "個人專案，2026 年 10 月。" },
          lede: {
            en: "A wooden settlement of up to 540 rooms, stacked in nine diagonal tiers.",
            zh: "最多 540 間房、九層斜向堆疊的木造聚落。"
          },
          problem: {
            en: "Keep hundreds of furnished rooms readable and smooth in one browser scene.",
            zh: "讓上百間有家具的房間，在同一個瀏覽器場景裡看得清楚、也跑得順。"
          },
          method: {
            en: "Wooden rooms with four, five or six faces are stacked in nine tiers, widest in the middle: 12, 30, 60, 96, 132, 96, 60, 36 and 18. The settlement grows outward from 36 to 540 rooms, and every room gets its own furniture and its own installation.",
            zh: "四、五、六面體的木質房間分九層堆疊，中段最多、上下收窄：12／30／60／96／132／96／60／36／18。聚落可從 36 間向外生長到 540 間，每間房都有自己的家具組合與專屬裝置。"
          },
          result: {
            en: "Atelier 05 refines the close-up craft: wood grain, wool felt, joinery, stitched seams and draped fabric. Each round is checked against recorded performance tests.",
            zh: "Atelier 05 精修近看細節：木紋、羊毛氈、木作接合、立體縫邊與垂墜織物；每一輪都有效能測試紀錄。"
          },
          tags: ["three.js", "WebGL", "Procedural layout", "Performance"],
          demo: "https://rolanthhuang.github.io/WOODWEAVE/",
          repo: "Woodweave",
          updated: "2026-10-15",
          image: "assets/img/woodweave",
          focus: "50% 50%"
        },
        {
          id: "ship-in-bottle",
          kind: "demo",
          paint: "#6D1F2B",
          plate: { en: "Ship in Bottle", zh: "瓶中船" },
          title: { en: "Ship in a bottle", zh: "拾光號 · 瓶中遠方" },
          context: { en: "Personal project, October 2026.", zh: "個人專案，2026 年 10 月。" },
          lede: {
            en: "A schooner, a lighthouse and a small sea, sealed in a green glass bottle in 1887.",
            zh: "一艘雙桅帆船、一座燈塔和一小片海，在 1887 年封進綠色玻璃瓶。"
          },
          problem: {
            en: "Make one small object worth turning over in your hands: glass, water, light and craft at desk scale.",
            zh: "做一個值得拿在手上翻看的小物件：桌面尺度的玻璃、水、光與工藝。"
          },
          method: {
            en: "A real-time WebGL 2 scene. Orbit and zoom the bottle, focus on details, shake the sea, and turn the wind from calm to storm and the light from dawn to night.",
            zh: "即時 WebGL 2 場景：可以環繞、縮放瓶子，聚焦細節、搖晃海面，把風從無風調到暴風，光線從清晨調到夜晚。"
          },
          result: {
            en: "You can engrave your own line on the brass plaque, take photos, and turn on the sound of the sea.",
            zh: "可以在銅牌刻上自己的字、拍照，也可以打開海的聲音。"
          },
          tags: ["three.js", "WebGL 2", "Materials", "Interaction design"],
          demo: "https://rolanthhuang.github.io/ShipInBottle/",
          repo: "ShipInBottle",
          updated: "2026-10-18",
          image: "assets/img/ship",
          focus: "55% 55%"
        }
      ]
    }
  ],

  /* The photographic hall: which repositories fill the four plaques when fewer than four are pinned,
     and which project each room in the photograph was painted for. */
  hall: {
    defaults: ["Binance_Trading_Volume_3D_Terrain_Diagram", "surfingisland", "Woodweave", "ShipInBottle"],
    painted: ["Binance_Trading_Volume_3D_Terrain_Diagram", "surfingisland", "Woodweave", "ShipInBottle"]
  },

  who: {
    paint: "#E3D7BC",
    wall: "#EDE5D0",
    plate: { en: "Who are you?", zh: "你是誰？" },
    question: { en: "“Who are YOU?” said the Caterpillar.", zh: "「你是誰？」毛毛蟲問。" },
    bio: [
      {
        en: "I'm Yi-Hsuan Huang, a math-trained risk and ML systems engineer based in Taichung, Taiwan.",
        zh: "我是黃一玄，數學背景的風控與 ML 系統工程師，住在台灣台中。"
      },
      {
        en: "Since 2018 I've built systems that watch user behavior as it happens and decide what to do about it: anomaly detection, risk scoring and automated decision logic, from raw data and feature pipelines to models in production.",
        zh: "2018 年起，我建造即時觀察使用者行為、並決定如何回應的系統：異常偵測、風險評分與自動決策邏輯，從原始資料、特徵管線一路到上線模型。"
      },
      {
        en: "Most of them ran in adversarial settings, where the people being modeled push back.",
        zh: "這些系統大多運作在對抗性的環境裡：被建模的人會反過來測試系統。"
      }
    ],
    openTo: {
      en: "Open to senior roles and consulting in trust & safety, fraud detection, risk ML and automated decision systems.",
      zh: "歡迎 Trust & Safety、詐欺偵測、風控 ML 與自動決策系統相關的資深職位與顧問合作。"
    },
    story: {
      title: { en: "Fig. 1. A user population, watched.", zh: "圖一：被觀察的使用者群體。" },
      text: {
        en: "A user population moves through behavior space like an amoeba. It changes shape to probe a system, or because something outside the system pushed it. The detector's job is to see the new shape while it is still forming.",
        zh: "使用者群體在行為空間裡像一隻變形蟲。它會變形去試探系統，也會因為系統外的因素而改變。偵測器的工作，是在新形狀還在成形時就看見它。"
      }
    },
    skills: [
      {
        k: { en: "Modeling", zh: "建模" },
        v: { en: "Time-series analysis, Hurst exponent, probabilistic modeling, game theory, k-means, graph and clustering methods", zh: "時間序列分析、Hurst exponent、機率模型、賽局理論、k-means、圖與分群方法" }
      },
      {
        k: { en: "Machine learning", zh: "機器學習" },
        v: { en: "XGBoost, CatBoost, feature engineering, multi-pipeline features for behavior drift", zh: "XGBoost、CatBoost、特徵工程、因應行為漂移的多管線特徵架構" }
      },
      {
        k: { en: "Engineering", zh: "工程" },
        v: { en: "Python, Go, SQL, ETL and ELT from raw data to model-ready datasets", zh: "Python、Go、SQL，從原始資料到模型可用資料集的 ETL／ELT" }
      },
      {
        k: { en: "Tools", zh: "工具" },
        v: { en: "GitLab, Jira, Confluence, Jupyter, Spyder", zh: "GitLab、Jira、Confluence、Jupyter、Spyder" }
      },
      {
        k: { en: "Languages", zh: "語言" },
        v: { en: "Mandarin (native), English (TOEIC 830)", zh: "中文（母語）、英語（TOEIC 830）" }
      }
    ],
    path: [
      {
        when: "2026",
        what: { en: "Independent projects: crypto market analytics and risk simulation; a material planning simulator", zh: "獨立專案：虛擬貨幣市場分析與風險模擬；物料規劃情境模擬" }
      },
      {
        when: "2025–26",
        what: { en: "LDR, online payment and transaction platform. Senior data analyst and ML engineer, remote", zh: "LDR 線上支付與交易平台，資深數據分析師 / ML 工程師（遠端）" }
      },
      {
        when: "2025",
        what: { en: "JVD, Taipei. Senior data engineer: found vulnerabilities in online system algorithms and wrote the technical documents for regulators", zh: "鑫鼎鑽科技（台北），資深資料工程師：找出線上系統演算法漏洞，撰寫產品機制送審文件" }
      },
      {
        when: "2024",
        what: { en: "Ing-fu, Taichung. Senior data engineer: online risk algorithms from design to testing", zh: "英富開發（台中），資深資料工程師：線上系統風控演算法，從設計到測試完成" }
      },
      {
        when: "2018–23",
        what: { en: "Online platforms, Taipei and Taichung. Risk system design and algorithm engineering", zh: "線上平台（台北、台中），風控系統設計與演算法工程" }
      },
      {
        when: "2016–17",
        what: { en: "Quanta Computer, Shanghai and California. Test engineer for server and rack builds", zh: "廣達電腦（上海、加州），伺服器與機櫃測試工程" }
      },
      {
        when: "2003–10",
        what: { en: "National Taiwan University. B.S. in Mathematics, then graduate study at the Institute of Physics (not completed)", zh: "國立台灣大學：數學系學士；物理研究所（肄業）" }
      }
    ]
  },

  garden: {
    paint: "#5E8A4E",
    wall: "#DDE9CF",
    plate: { en: "Behind the curtain", zh: "窗簾後" },
    title: { en: "Behind the curtain", zh: "窗簾後" },
    line: {
      en: "A little door about fifteen inches high, and a garden behind it: the full working materials, and every public repository.",
      zh: "一扇大約十五英寸高的小門，門後是一座花園：完整的工作資料，以及所有公開的 repo。"
    },
    archives: [
      {
        title: { en: "Anomaly detection materials", zh: "異常偵測完整資料" },
        note: { en: "Supporting material for the two-stage detection work. Opens a Dropbox folder.", zh: "兩階段異常偵測工作的相關資料，開啟 Dropbox 資料夾。" },
        url: "https://www.dropbox.com/scl/fo/79dsnbmjs8pt1pm5hc9o9/AIxSXyfTG-m6CNhUq_2Gr50?rlkey=fe3qs7ngho3b83cgygbzayn5g&st=qtawt5tj&dl=0"
      },
      {
        title: { en: "Multi-platform risk control materials", zh: "跨平台風控完整資料" },
        note: { en: "Supporting material for the multi-platform control and balancing work. Opens a Dropbox folder.", zh: "跨平台風控與多代理平衡工作的相關資料，開啟 Dropbox 資料夾。" },
        url: "https://www.dropbox.com/scl/fo/bbqcu8bydudmingg61rkw/AIO8SNby0HozL2r--bJvTzg?rlkey=b3o601ut4iuaxniwyga8lvmdj&st=lzz86dq4&dl=0"
      }
    ]
  }
};
