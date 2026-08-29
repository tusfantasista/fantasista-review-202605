(function () {
  const hero = document.querySelector("[data-film-hero]");
  if (!hero) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const eraStories = {
    "1966-68": {
      label: "1〜10年｜昭和41〜43年",
      range: "1966–68",
      club: "1966年、吉澤幸男らが舞踏研究部を創部。練習・合宿・ダンスパーティーの原型が生まれる。",
      tus: "1967年、野田校舎に理工学部を開設。神楽坂から教育研究の場が広がる。",
      world: "高度経済成長の只中。テレビと若者文化が、学生生活を大きく変える。",
    },
    "1969-71": {
      label: "1〜10年｜昭和44〜46年",
      range: "1969–71",
      club: "創部期の部員が練習、合宿、ミーティングを重ね、次の世代へ活動の型を渡していく。",
      tus: "野田校舎を含む教育研究体制が整い、理工系総合大学として歩みを進める。",
      world: "1970年大阪万博。未来技術への期待が高まり、カラー映像が日常へ広がる。",
    },
    "1972-74": {
      label: "1〜10年｜昭和47〜49年",
      range: "1972–74",
      club: "競技、練習、合宿を軸に、創部世代から受け継いだ舞研の日常を定着させる。",
      tus: "神楽坂と野田を拠点に、理学・薬学・工学・理工学の教育研究を展開。",
      world: "1973年の石油危機で社会が転換。省資源と技術革新への関心が高まる。",
    },
    "1975-76": {
      label: "1〜10年｜昭和50〜51年",
      range: "1975–76",
      club: "1976年、創部10周年記念祝賀会を開催。最初の10年をOBOGと現役で祝う。",
      tus: "1976年、工学部第二部を新設。工学部は工学部第一部へ名称変更。",
      world: "家庭用VHSが登場。個人が写真だけでなく映像も残す時代が始まる。",
    },
    "1977-79": {
      label: "11〜20年｜昭和52〜54年",
      range: "1977–79",
      club: "10周年を越え、競技会と学内行事を行き来しながら次の10年の活動を積み重ねる。",
      tus: "神楽坂・野田の二つの拠点で、教育と研究の規模を広げていく。",
      world: "ディスコ音楽が世界的に流行。踊る文化が若者の街とメディアを彩る。",
    },
    "1980-82": {
      label: "11〜20年｜昭和55〜57年",
      range: "1980–82",
      club: "1982年の理大祭写真が残る。舞台と学園祭も、舞研を知ってもらう大切な場になる。",
      tus: "1981年、創立100周年。記念式典、新1号館、百年史編纂の節目を迎える。",
      world: "パーソナルコンピューターが普及へ向かい、情報化の入口が開く。",
    },
    "1983-86": {
      label: "11〜20年｜昭和58〜61年",
      range: "1983–86",
      club: "1985年夏合宿などの記録が残る。1986年に創部20周年を迎える。",
      tus: "翌1987年の基礎工学部開設と長万部での全寮制教育に向け、次の展開へ。",
      world: "CDと家庭用ビデオが定着。音楽と映像の残し方が変わる。",
    },
    "1987-89": {
      label: "21〜30年｜昭和62〜平成元年",
      range: "1987–89",
      club: "1987年夏合宿、1989年理大祭の写真が残る。昭和から平成へ、活動をつなぐ。",
      tus: "1987年、基礎工学部を開設。長万部で学ぶ独自の教育制度が始まる。",
      world: "バブル景気の華やかさとともに、映像・音楽・ファッションが多様化。",
    },
    "1990-92": {
      label: "21〜30年｜平成2〜4年",
      range: "1990–92",
      club: "創部25周年の時期。大会・合宿・学園祭の記録は、現在も年代確認と整理を続けている。",
      tus: "理工系教育の基盤を広げながら、新しい学部構想へ歩みを進める。",
      world: "バブル崩壊。携帯電話やデジタル機器が、少しずつ身近になり始める。",
    },
    "1993-96": {
      label: "21〜30年｜平成5〜8年",
      range: "1993–96",
      club: "1995年栄大祭を経て、1996年に田中・木戸組が冬全サンバ優勝。理科大初の全日本制覇。",
      tus: "1993年に経営学部、1996年に私立大学初の連携大学院を開設。",
      world: "インターネットが普及期へ。1996年『Shall we ダンス？』公開で社交ダンスが脚光を浴びる。",
    },
    "1997-99": {
      label: "31〜40年｜平成9〜11年",
      range: "1997–99",
      club: "1999年、伊從・大崎組が夏全ラテン総合優勝。引退試合で全国の頂点に立つ。",
      tus: "学外研究機関との連携を深め、研究と人材育成のネットワークを拡大。",
      world: "1999年にiモード開始。インターネットが携帯電話から日常へ入る。",
    },
    "2000-02": {
      label: "31〜40年｜平成12〜14年",
      range: "2000–02",
      club: "2001年、東部Ⅱ部戦団体優勝。夏全モダン2位、冬全クイック2位に加え、ワルツ6位・チャチャ7位と全国決勝へ。",
      tus: "大学院と研究拠点の連携を広げ、高度な理工系人材の育成を推進。",
      world: "ブロードバンドとデジタルカメラが普及。写真共有がフィルムからデータへ移る。",
    },
    "2003-06": {
      label: "31〜40年｜平成15〜18年",
      range: "2003–06",
      club: "2004年Ⅰ部校昇格、2005年夏全団体5位・冬全団体3位。2006年は夏全ラテン総合・冬全チャチャチャ優勝。",
      tus: "2004年に専門職大学院を設置。2006年、創立125周年を迎える。",
      world: "ブログ、SNS、動画共有が登場。舞台の記録をネットで届ける時代へ。",
    },
    "2007-09": {
      label: "41〜50年｜平成19〜21年",
      range: "2007–09",
      club: "2008年FANTASISTA発足。冬全クイックは別の組が2008・2009年に優勝し、理科大として2年連続優勝。",
      tus: "創立125周年を越え、大学と研究機関・社会を結ぶ連携を拡大。",
      world: "日本でiPhone発売。SNSが同期・先輩・後輩を再び結ぶ連絡手段になる。",
    },
    "2010-12": {
      label: "41〜50年｜平成22〜24年",
      range: "2010–12",
      club: "2010年冬全ワルツ2位。若代・伊藤組は冬全で唯一の3年連続決勝進出。2012年も全国決勝へ。",
      tus: "神楽坂・野田に加え、葛飾の新キャンパス開設準備が進む。",
      world: "スマートフォンとクラウドが急速に普及。写真と連絡が常時つながる。",
    },
    "2013-16": {
      label: "41〜50年｜平成25〜28年",
      range: "2013–16",
      club: "2014年の体制見直しを越え活動を再開。2016年は創部50周年、初の冬全ルンバ優勝、Ⅰ部校再昇格。",
      tus: "2013年葛飾キャンパス開設。2016年、工学部第一部を工学部へ改称。",
      world: "スマートフォン動画とSNSで、大会結果と踊りが即時に共有される。",
    },
    "2017-19": {
      label: "51〜60年｜平成29〜令和元年",
      range: "2017–19",
      club: "2018年冬全FM初出場。2016〜19年は冬全4年連続優勝、2019年には初の冬全タンゴ優勝を達成。",
      tus: "神楽坂・野田・葛飾を軸に、分野横断の教育研究を推進。",
      world: "写真・動画のクラウド共有が定着し、舞研の記録が各世代の端末に残る。",
    },
    "2020-22": {
      label: "51〜60年｜令和2〜4年",
      range: "2020–22",
      club: "活動制約を越え、2021年夏全ラテン5位・冬全チャチャ3位、2022年冬全チャチャ2位。",
      tus: "2021年、創立140周年。先進工学部が葛飾で4年間の一貫教育を開始。",
      world: "感染症下で大会と交流が制約され、同じ場所に集まり踊る価値を再認識。",
    },
    "2023-26": {
      label: "51〜60年｜令和5〜8年",
      range: "2023–26",
      club: "2025年冬全パソ4位。2026年に創部60周年を迎え、世代を超えて次の挑戦へバトンを渡す。",
      tus: "2026年、33年ぶりの新学部となる創域情報学部を野田に開設。",
      world: "AI・量子・ネットワーク技術が進む時代。対面の交流と60年の記録を未来へつなぐ。",
    },
  };

  const scienceField = hero.querySelector("[data-science-field]");
  const competitionStories = {
    "1966-68": "両部門｜創部期の競技記録を整理中",
    "1969-71": "両部門｜競技・練習文化を継承",
    "1972-74": "両部門｜大会記録を整理中",
    "1975-76": "両部門｜10周年までの記録を整理中",
    "1977-79": "両部門｜大会記録を整理中",
    "1980-82": "両部門｜理大祭・大会記録を整理中",
    "1983-86": "両部門｜合宿・大会記録を整理中",
    "1987-89": "両部門｜夏合宿・理大祭の記録あり",
    "1990-92": "両部門｜大会記録を整理中",
    "1993-96": "ラテン躍進｜1996 冬全サンバ優勝",
    "1997-99": "ラテン優勢｜1999 夏全ラテン総合優勝",
    "2000-02": "モダン優勢｜夏全モダン2位・冬全クイック2位",
    "2003-06": "ラテン躍進｜2006 夏全・冬全で全国優勝",
    "2007-09": "モダン優勢｜冬全クイック2年連続優勝",
    "2010-12": "拮抗｜ワルツ2位、ラテン総合5位・ルンバ4位",
    "2013-16": "ラテン優勢｜2016 冬全ルンバ優勝",
    "2017-19": "両部門で優勝｜クイック・ルンバ・タンゴ",
    "2020-22": "ラテン優勢｜冬全チャチャ3位・2位",
    "2023-26": "ラテン躍進｜2025 冬全パソ4位",
  };
  const fieldModes = {
    "1966-68": "origin", "1969-71": "origin", "1972-74": "expansion", "1975-76": "expansion",
    "1977-79": "expansion", "1980-82": "digital", "1983-86": "digital",
    "1987-89": "digital", "1990-92": "digital", "1993-96": "network",
    "1997-99": "network", "2000-02": "network", "2003-06": "network",
    "2007-09": "network", "2010-12": "network", "2013-16": "network",
    "2017-19": "network", "2020-22": "quantum", "2023-26": "quantum",
  };
  const danceLabel = hero.querySelector("[data-dance-label]");
  const featuredDances = [
    ["waltz", "Natural Spin Turn"], ["waltz", "Double Reverse Spin"], ["waltz", "Hover Corte"],
    ["natural", "Progressive Link"], ["natural", "Closed Promenade"], ["natural", "Five Step"],
    ["natural", "Natural Turn"], ["natural", "Fleckerl"], ["natural", "Contra Check"],
    ["counter", "Feather Step"], ["counter", "Three Step"], ["counter", "Change of Direction"],
    ["counter", "Progressive Chassé"], ["counter", "Running Finish"], ["counter", "Fishtail"],
    ["samba", "New York"], ["samba", "Cuban Breaks"], ["samba", "Three Cha Cha Chas"],
    ["samba", "Botafogo"], ["samba", "Volta"], ["samba", "Promenade and Counter Promenade Runs"],
    ["spiral", "Fan"], ["spiral", "Alemana"], ["spiral", "Sliding Doors"],
    ["spiral", "Appel"], ["spiral", "Chassé Cape"], ["spiral", "Spanish Line"],
    ["spiral", "Fallaway Rock"], ["spiral", "American Spin"], ["spiral", "Stop and Go"],
  ];
  const featuredDance = featuredDances[Math.floor(Math.random() * featuredDances.length)];
  hero.dataset.dance = featuredDance[0];
  if (danceLabel) danceLabel.textContent = featuredDance[1];

  const eraButtons = Array.from(hero.querySelectorAll("[data-era-button]"));
  const decadeButtons = Array.from(hero.querySelectorAll("[data-decade-button]"));
  const eraFields = {
    label: hero.querySelector("[data-era-label]"),
    year: hero.querySelector("[data-era-year]"),
    club: hero.querySelector("[data-era-club]"),
    competition: hero.querySelector("[data-era-competition]"),
    tus: hero.querySelector("[data-era-tus]"),
    world: hero.querySelector("[data-era-world]"),
  };
  const eraStory = hero.querySelector("[data-era-story]");
  let eraIndex = 0;
  let eraTimer = 0;

  function selectDecadeForEra(year) {
    const activeButton = eraButtons.find(function (button) { return button.dataset.era === year; });
    const activeItem = activeButton ? activeButton.closest("[data-decade-group]") : null;
    const decade = activeItem ? activeItem.dataset.decadeGroup : "1";
    const visibleItems = [];
    eraButtons.forEach(function (button) {
      const item = button.closest("[data-decade-group]");
      const visible = item && item.dataset.decadeGroup === decade;
      if (item) item.hidden = !visible;
      if (visible) visibleItems.push(item);
    });
    decadeButtons.forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.decade === decade));
    });
    const flow = hero.querySelector(".festa-film-era-flow");
    if (flow) flow.style.setProperty("--period-count", String(Math.max(1, visibleItems.length)));
    hero.dataset.activeDecade = decade;
  }

  function showEra(year, userInitiated) {
    const story = eraStories[year];
    if (!story) return;
    selectDecadeForEra(year);
    eraIndex = Math.max(0, eraButtons.findIndex(function (button) { return button.dataset.era === year; }));
    eraButtons.forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.era === year));
    });
    eraFields.label.textContent = story.label;
    eraFields.year.textContent = story.range || year;
    eraFields.club.textContent = story.club;
    if (eraFields.competition) eraFields.competition.textContent = competitionStories[year] || "両部門｜記録を整理中";
    eraFields.tus.textContent = story.tus;
    eraFields.world.textContent = story.world;
    hero.dataset.activeEra = year;
    hero.dataset.field = fieldModes[year] || "network";
    if (eraStory && !reduceMotion.matches) {
      eraStory.classList.remove("is-revealing");
      void eraStory.offsetWidth;
      eraStory.classList.add("is-revealing");
    }
    if (userInitiated) restartEraTimer();
  }

  function restartEraTimer() {
    window.clearInterval(eraTimer);
    if (reduceMotion.matches || document.hidden) return;
    eraTimer = window.setInterval(function () {
      eraIndex = (eraIndex + 1) % eraButtons.length;
      showEra(eraButtons[eraIndex].dataset.era, false);
    }, 6500);
  }

  eraButtons.forEach(function (button) {
    button.addEventListener("click", function () { showEra(button.dataset.era, true); });
  });
  decadeButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const firstInDecade = eraButtons.find(function (eraButton) {
        const item = eraButton.closest("[data-decade-group]");
        return item && item.dataset.decadeGroup === button.dataset.decade;
      });
      if (firstInDecade) showEra(firstInDecade.dataset.era, true);
    });
  });
  if (eraButtons.length) {
    showEra(eraButtons[0].dataset.era, false);
    restartEraTimer();
  }

  function createScienceField(canvas) {
    if (!canvas) return null;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return null;
    let width = 0;
    let height = 0;
    let ratio = 1;
    let points = [];
    let filmDust = [];

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      points = Array.from({ length: Math.max(18, Math.round(width / 42)) }, function (_, index) {
        const lane = index % 5;
        return {
          x: ((index * 137.5) % 1000) / 1000 * width,
          y: (0.14 + lane * 0.17 + ((index * 29) % 11) / 100) * height,
          phase: index * 0.71,
        };
      });
      filmDust = Array.from({ length: Math.max(24, Math.round(width / 30)) }, function (_, index) {
        return {
          x: ((index * 173.7) % 997) / 997 * width,
          y: ((index * 83.3) % 613) / 613 * height,
          radius: 0.25 + ((index * 7) % 9) / 10,
          phase: index * 1.13,
          drift: 2 + (index % 5),
        };
      });
    }

    function line(x1, y1, x2, y2, alpha, lineWidth) {
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.strokeStyle = "rgba(216, 174, 91," + alpha + ")";
      context.lineWidth = lineWidth || 1;
      context.stroke();
    }

    function drawOrigin(time) {
      const spacing = Math.max(42, width / 15);
      context.save();
      context.translate((time * 2) % spacing, 0);
      for (let x = -spacing; x < width + spacing; x += spacing) line(x, 0, x, height, 0.055, 0.7);
      for (let y = 20; y < height; y += spacing) line(0, y, width, y, 0.04, 0.7);
      context.restore();
      context.beginPath();
      for (let x = 0; x <= width; x += 4) {
        const y = height * 0.49 + Math.sin(x * 0.018 + time * 0.45) * 24 + Math.sin(x * 0.006) * 18;
        if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.strokeStyle = "rgba(226,188,112,0.17)";
      context.lineWidth = 1;
      context.stroke();
    }

    function drawDigital(time) {
      const step = 28;
      for (let y = 20; y < height; y += step) {
        for (let x = 12; x < width; x += step) {
          const pulse = (Math.sin(time * 0.75 + x * 0.031 + y * 0.019) + 1) / 2;
          if (pulse > 0.72) {
            context.fillStyle = "rgba(218,176,94," + (0.025 + pulse * 0.075) + ")";
            context.fillRect(x, y, 8, 1);
          }
        }
      }
      drawOrigin(time * 0.36);
    }

    function drawNetwork(time, quantum) {
      const drift = Math.sin(time * 0.22) * 5;
      for (let index = 0; index < points.length; index += 1) {
        const point = points[index];
        const x = point.x + Math.sin(time * 0.16 + point.phase) * 5;
        const y = point.y + Math.cos(time * 0.13 + point.phase) * 4 + drift;
        for (let next = index + 1; next < Math.min(points.length, index + 5); next += 1) {
          const target = points[next];
          const tx = target.x + Math.sin(time * 0.16 + target.phase) * 5;
          const ty = target.y + Math.cos(time * 0.13 + target.phase) * 4 + drift;
          const distance = Math.hypot(tx - x, ty - y);
          if (distance < width * 0.2) line(x, y, tx, ty, quantum ? 0.15 : 0.105, 0.7);
        }
        context.beginPath();
        context.arc(x, y, quantum ? 1.7 : 1.25, 0, Math.PI * 2);
        context.fillStyle = quantum ? "rgba(239,205,135,0.48)" : "rgba(217,174,91,0.34)";
        context.fill();
      }
    }

    function drawQuantum(time) {
      drawNetwork(time, true);
      const center = height * 0.48;
      for (let wave = 0; wave < 4; wave += 1) {
        context.beginPath();
        for (let x = 0; x <= width; x += 3) {
          const envelope = Math.sin(Math.PI * x / width);
          const y = center + (wave - 1.5) * 18 + Math.sin(x * 0.025 - time * (0.55 + wave * 0.05)) * 18 * envelope;
          if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
        }
        context.strokeStyle = "rgba(232,194,119," + (0.13 + wave * 0.025) + ")";
        context.lineWidth = 0.8;
        context.stroke();
      }
    }

    function drawRelay(time) {
      const progress = (time * 0.055) % 1;
      const x = -40 + progress * (width + 80);
      const y = height * (0.72 - Math.sin(progress * Math.PI) * 0.1);
      const gradient = context.createLinearGradient(x - 82, y, x + 22, y);
      gradient.addColorStop(0, "rgba(233,190,103,0)");
      gradient.addColorStop(0.72, "rgba(233,190,103,0.16)");
      gradient.addColorStop(1, "rgba(255,226,162,0.7)");
      context.beginPath();
      context.moveTo(x - 82, y + 16);
      context.lineTo(x + 18, y - 16);
      context.strokeStyle = gradient;
      context.lineWidth = 1.4;
      context.stroke();
    }

    function drawFilmDust(time) {
      context.save();
      context.globalCompositeOperation = "screen";
      filmDust.forEach(function (dust, index) {
        const shimmer = Math.max(0, Math.sin(time * 0.72 + dust.phase));
        if (shimmer < 0.42) return;
        const x = dust.x + Math.sin(time * 0.11 + dust.phase) * dust.drift;
        const y = (dust.y - time * (0.55 + (index % 4) * 0.12) + height) % height;
        context.beginPath();
        context.arc(x, y, dust.radius, 0, Math.PI * 2);
        context.fillStyle = "rgba(245,218,164," + ((shimmer - 0.42) * 0.13) + ")";
        context.fill();
      });
      context.restore();
    }

    const dances = [
      { code: "W", name: "WALTZ", figures: ["NATURAL SPIN TURN", "DOUBLE REVERSE SPIN", "HOVER CORTE"], compact: ["SPIN TURN", "DOUBLE REVERSE", "HOVER CORTE"] },
      { code: "T", name: "TANGO", figures: ["PROGRESSIVE LINK", "CLOSED PROMENADE", "FIVE STEP"], compact: ["PROG LINK", "CLOSED PROM", "FIVE STEP"] },
      { code: "V", name: "VIENNESE", figures: ["NATURAL TURN", "FLECKERL", "CONTRA CHECK"], compact: ["NAT TURN", "FLECKERL", "CONTRA CHECK"] },
      { code: "F", name: "FOXTROT", figures: ["FEATHER STEP", "THREE STEP", "CHANGE OF DIRECTION"], compact: ["FEATHER STEP", "THREE STEP", "CHANGE DIR"] },
      { code: "Q", name: "QUICKSTEP", figures: ["PROGRESSIVE CHASSÉ", "RUNNING FINISH", "FISHTAIL"], compact: ["PROG CHASSÉ", "RUNNING FINISH", "FISHTAIL"] },
      { code: "C", name: "CHA CHA", figures: ["NEW YORK", "CUBAN BREAKS", "THREE CHA CHA CHAS"], compact: ["NEW YORK", "CUBAN BREAKS", "3 CHA CHAS"] },
      { code: "S", name: "SAMBA", figures: ["BOTAFOGO", "VOLTA", "PROMENADE AND COUNTER PROMENADE RUNS"], compact: ["BOTAFOGO", "VOLTA", "PROM RUNS"] },
      { code: "R", name: "RUMBA", figures: ["FAN", "ALEMANA", "SLIDING DOORS"], compact: ["FAN", "ALEMANA", "SLIDING DOORS"] },
      { code: "P", name: "PASO DOBLE", figures: ["APPEL", "CHASSÉ CAPE", "SPANISH LINE"], compact: ["APPEL", "CHASSÉ CAPE", "SPANISH LINE"] },
      { code: "J", name: "JIVE", figures: ["FALLAWAY ROCK", "AMERICAN SPIN", "STOP AND GO"], compact: ["FALLAWAY", "AMERICAN SPIN", "STOP AND GO"] },
    ].map(function (dance) {
      return Object.assign({}, dance, { selectedFigure: Math.floor(Math.random() * dance.figures.length) });
    });

    function drawTenDanceSignatures(time) {
      const standardColor = [220, 190, 128];
      const latinColor = [205, 137, 70];
      const leftPad = Math.max(20, width * 0.032);
      const top = height * 0.17;
      const spacing = height * 0.145;
      const compact = width < 640;
      const laneWidth = compact ? width * 0.39 : width * 0.43;

      context.save();
      context.font = compact ? "8px Georgia, serif" : "9px Georgia, serif";
      context.fillStyle = "rgba(226,198,139,0.38)";
      context.textAlign = "left";
      context.fillText(compact ? "STANDARD · W T V F Q" : "STANDARD · WALTZ  TANGO  VIENNESE  FOXTROT  QUICKSTEP", leftPad, height * 0.075);
      context.fillStyle = "rgba(211,145,76,0.4)";
      context.textAlign = "right";
      context.fillText(compact ? "C S R P J · LATIN" : "CHA CHA  SAMBA  RUMBA  PASO DOBLE  JIVE · LATIN", width - leftPad, height * 0.075);
      context.restore();

      dances.forEach(function (dance, index) {
        const latin = index >= 5;
        const row = index % 5;
        const base = top + spacing * row;
        const color = index < 5 ? standardColor : latinColor;
        const phase = time * (0.18 + index * 0.012) + index * 0.73;
        const startX = latin ? width - leftPad : leftPad;
        const direction = latin ? -1 : 1;
        context.beginPath();
        for (let step = 0; step <= 72; step += 1) {
          const progress = step / 72;
          const x = startX + direction * laneWidth * progress;
          const envelope = Math.sin(progress * Math.PI);
          let motion = 0;
          if (index === 0) motion = Math.sin(progress * Math.PI * 2 + phase) * 8;
          if (index === 1) motion = (2 / Math.PI) * Math.asin(Math.sin(progress * Math.PI * 5 + phase)) * 7;
          if (index === 2) motion = Math.sin(progress * Math.PI * 4 + phase) * 11 * envelope;
          if (index === 3) motion = Math.sin(progress * Math.PI + phase * 0.45) * 7 + (progress - 0.5) * 7;
          if (index === 4) motion = Math.sin(progress * Math.PI * 9 + phase) * 4;
          if (index === 5) motion = Math.sin(progress * Math.PI * 6 + phase) * 5 + Math.sin(progress * Math.PI * 12) * 2;
          if (index === 6) motion = Math.sin(progress * Math.PI * 4 + phase) * 8 + Math.sin(progress * Math.PI * 8 + phase) * 3;
          if (index === 7) motion = Math.sin(progress * Math.PI * 2 + phase) * Math.cos(progress * Math.PI * 2) * 10;
          if (index === 8) motion = (progress - 0.5) * -12 + Math.sin(progress * Math.PI * 2 + phase) * 2;
          if (index === 9) motion = (2 / Math.PI) * Math.asin(Math.sin(progress * Math.PI * 10 + phase)) * 5;
          const y = base + motion;
          if (step === 0) context.moveTo(x, y); else context.lineTo(x, y);
        }
        const lineGradient = context.createLinearGradient(startX, base, startX + direction * laneWidth, base);
        lineGradient.addColorStop(0, "rgba(" + color.join(",") + ",0.16)");
        lineGradient.addColorStop(0.62, "rgba(" + color.join(",") + ",0.1)");
        lineGradient.addColorStop(1, "rgba(" + color.join(",") + ",0.015)");
        context.strokeStyle = lineGradient;
        context.lineWidth = index === 8 ? 1 : 0.65;
        context.stroke();

        const pulse = (time * (0.018 + index * 0.0018) + index * 0.093) % 1;
        const pulseX = startX + direction * laneWidth * pulse;
        context.beginPath();
        context.arc(pulseX, base, index === 6 ? 1.7 : 1.15, 0, Math.PI * 2);
        context.fillStyle = "rgba(" + color.join(",") + ",0.42)";
        context.fill();

        context.save();
        context.fillStyle = "rgba(" + color.join(",") + ",0.48)";
        context.font = compact ? "8px Georgia, serif" : "9px Georgia, serif";
        context.textAlign = latin ? "right" : "left";
        context.fillText(compact ? dance.code : dance.code + "  " + dance.name, startX, base - 7);
        context.fillStyle = "rgba(" + color.join(",") + ",0.29)";
        context.font = compact ? "6px Georgia, serif" : "7px Georgia, serif";
        context.fillText(compact ? dance.compact[dance.selectedFigure] : dance.figures[dance.selectedFigure], startX, base + 8);
        context.restore();
      });
    }

    function render(timeMs) {
      const time = timeMs / 1000;
      context.clearRect(0, 0, width, height);
      const mode = hero.dataset.field || "origin";
      const eraTint = {
        origin: "rgba(57,31,8,0.12)",
        expansion: "rgba(7,39,49,0.13)",
        digital: "rgba(4,35,42,0.16)",
        network: "rgba(4,25,52,0.18)",
        quantum: "rgba(27,14,58,0.2)",
      };
      context.fillStyle = eraTint[mode] || eraTint.origin;
      context.fillRect(0, 0, width, height);
      drawTenDanceSignatures(time);
      if (mode === "origin" || mode === "expansion") drawOrigin(time);
      else if (mode === "digital") drawDigital(time);
      else if (mode === "network") drawNetwork(time, false);
      else drawQuantum(time);
      drawRelay(time);
      drawFilmDust(time);
    }

    resize();
    return { render: render, resize: resize };
  }

  const field = createScienceField(scienceField);
  function smoothStep(value) {
    const clamped = Math.max(0, Math.min(1, value));
    return clamped * clamped * (3 - 2 * clamped);
  }

  function filmPace(time, phase) {
    const cycle = ((time / 24) + phase) % 1;

    // A slow gather, a confident sweep, and a held finish echo waltz phrasing.
    if (cycle < 0.16) return 0.2 + (smoothStep(cycle / 0.16) * 1.08);
    if (cycle < 0.46) return 1.28;
    if (cycle < 0.7) return 1.28 - (smoothStep((cycle - 0.46) / 0.24) * 0.98);
    return 0.3;
  }

  const strips = Array.from(hero.querySelectorAll("[data-film-strip]")).map(function (strip, stripIndex) {
    const rail = strip.querySelector("[data-film-rail]");
    const sequence = strip.querySelector("[data-film-sequence]");
    if (!rail || !sequence) return null;

    const cloneCount = Math.max(2, Math.ceil(window.innerWidth / Math.max(sequence.scrollWidth, 1)) + 2);
    for (let index = 1; index < cloneCount; index += 1) {
      const clone = sequence.cloneNode(true);
      clone.removeAttribute("data-film-sequence");
      rail.append(clone);
    }

    return {
      rail: rail,
      sequence: sequence,
      direction: Number(strip.dataset.direction || -1),
      speed: Number(strip.dataset.speed || 24),
      phase: stripIndex * 0.37,
      offset: 0,
      width: sequence.scrollWidth,
    };
  }).filter(Boolean);

  if (field) field.render(0);
  if (!strips.length || reduceMotion.matches) return;

  strips.forEach(function (strip) {
    if (strip.direction > 0) strip.offset = -strip.width;
  });

  let active = true;
  let frameId = 0;
  let previousTime = performance.now();

  function render(time) {
    const elapsed = Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;

    if (active && !document.hidden) {
      if (field) field.render(time);
      strips.forEach(function (strip) {
        const pace = filmPace(time / 1000, strip.phase);
        strip.offset += strip.direction * strip.speed * pace * elapsed;
        if (strip.direction < 0 && strip.offset <= -strip.width) strip.offset += strip.width;
        if (strip.direction > 0 && strip.offset >= 0) strip.offset -= strip.width;
        strip.rail.style.transform = "translate3d(" + strip.offset.toFixed(2) + "px, 0, 0)";
      });
    }
    frameId = window.requestAnimationFrame(render);
  }

  const observer = new IntersectionObserver(function (entries) {
    active = entries.some(function (entry) { return entry.isIntersecting; });
    previousTime = performance.now();
    if (active) restartEraTimer();
    else window.clearInterval(eraTimer);
  }, { rootMargin: "120px 0px" });
  observer.observe(hero);

  window.addEventListener("resize", function () {
    if (field) field.resize();
    strips.forEach(function (strip) {
      strip.width = strip.sequence.scrollWidth;
      strip.offset = strip.direction > 0 ? -strip.width : 0;
    });
  }, { passive: true });

  reduceMotion.addEventListener("change", function (event) {
    if (event.matches) {
      window.clearInterval(eraTimer);
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      strips.forEach(function (strip) { strip.rail.style.transform = "none"; });
      return;
    }
    previousTime = performance.now();
    restartEraTimer();
    if (!frameId) frameId = window.requestAnimationFrame(render);
  });

  frameId = window.requestAnimationFrame(render);
})();
