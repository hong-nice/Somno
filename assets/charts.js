/* ============================================================
   睡眠数据看板 · charts.js
   模拟 30 天睡眠数据（种子随机，结果稳定）+ ECharts 渲染
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 读取主题变量 ---------- */
  var style = getComputedStyle(document.documentElement);
  var ink    = style.getPropertyValue('--ink').trim();
  var muted  = style.getPropertyValue('--muted').trim();
  var rule   = style.getPropertyValue('--rule').trim();
  var accent = style.getPropertyValue('--accent').trim();
  var accent2= style.getPropertyValue('--accent2').trim();
  var deep   = style.getPropertyValue('--deep').trim();
  var light  = style.getPropertyValue('--light').trim();
  var rem    = style.getPropertyValue('--rem').trim();
  var awake  = style.getPropertyValue('--awake').trim();
  var amber  = style.getPropertyValue('--amber').trim();
  var good   = style.getPropertyValue('--good').trim();

  var FONT_D = "'Jura','PingFang SC',sans-serif";
  var FONT_M = "'JetBrains Mono',monospace";

  /* ---------- 种子随机 ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var rand = mulberry32(20261024);

  /* ---------- 30 天数据生成（9.25 - 10.24，含昨夜） ---------- */
  var DAYS = 30;
  var records = []; // 旧 → 新
  for (var i = DAYS - 1; i >= 0; i--) {
    var d = new Date(2026, 9, 24);
    d.setDate(d.getDate() - i);
    var dow = d.getDay();
    var isWeekend = (dow === 0 || dow === 6);

    var bed = 1385 + (isWeekend ? 58 : 0) + (rand() - 0.5) * 72;   // 入睡分钟（0点起）
    bed = Math.round(bed);
    var dur = (isWeekend ? 7.95 : 7.3) + (rand() - 0.5) * 1.6;     // 在床时长（小时）
    dur = Math.max(6.15, Math.min(9.2, dur));
    var awakeMin = Math.round(4 + rand() * 18);                    // 夜间清醒合计
    var sleepMin = Math.round(dur * 60 - awakeMin);
    var deepPct = 0.175 + rand() * 0.05;
    var remPct  = 0.205 + rand() * 0.05;
    var deepMin = Math.round(sleepMin * deepPct);
    var remMin  = Math.round(sleepMin * remPct);
    var lightMin = sleepMin - deepMin - remMin;
    var score = Math.round(56 + dur * 3.6 + deepPct * 40 - awakeMin * 0.8 + (rand() - 0.5) * 6);
    score = Math.max(58, Math.min(96, score));
    var rhr = 53 + rand() * 9;
    var br  = 14.1 + rand() * 2.4;

    records.push({
      date: d,
      label: (d.getMonth() + 1) + '.' + d.getDate(),
      dow: dow, isWeekend: isWeekend,
      bed: bed,                          // 分钟（可>1440 表示次日 0 点后）
      wake: Math.round((bed + dur * 60) % 1440),
      dur: dur, awakeMin: awakeMin,
      deepMin: deepMin, lightMin: lightMin, remMin: remMin,
      score: score, rhr: rhr, br: br
    });
  }
  var last = records[records.length - 1]; // 昨夜（10.23 夜）

  /* ---------- 工具 ---------- */
  function mm(min) { // 分钟 → HH:MM（跨 0 点取模）
    var m = ((min % 1440) + 1440) % 1440;
    return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2);
  }
  function durText(h) {
    var total = Math.round(h * 60);
    return Math.floor(total / 60) + ' 小时 ' + (total % 60) + ' 分';
  }
  function avg(arr) { return arr.reduce(function (a, b) { return a + b; }, 0) / arr.length; }

  function init(id) {
    var el = document.getElementById(id);
    var c = echarts.init(el);
    window.addEventListener('resize', function () { c.resize(); });
    return c;
  }
  var baseTip = {
    appendToBody: true,
    backgroundColor: 'rgba(10,15,30,0.94)',
    borderColor: rule, borderWidth: 1, padding: [10, 14],
    textStyle: { color: ink, fontSize: 12, fontFamily: FONT_M },
    extraCssText: 'border-radius:10px;backdrop-filter:blur(6px);box-shadow:0 8px 30px rgba(0,0,0,.45);'
  };

  /* ============================================================
     ① 评分仪表盘
     ============================================================ */
  var gradeOf = function (s) {
    if (s >= 90) return '极佳';
    if (s >= 80) return '良好';
    if (s >= 70) return '一般';
    return '欠佳';
  };
  var gaugeColor = [[0.65, '#FF9E7A'], [0.78, '#FFC46B'], [0.9, '#7BE0B2'], [1, '#56D9CF']];

  var cGauge = init('chart-gauge');
  cGauge.setOption({
    series: [{
      type: 'gauge', startAngle: 210, endAngle: -30, min: 0, max: 100,
      radius: '96%', center: ['50%', '58%'],
      progress: {
        show: true, width: 16, roundCap: true,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#5E6EFF' }, { offset: 0.6, color: '#97A5FF' }, { offset: 1, color: '#56D9CF' }
          ])
        }
      },
      axisLine: { roundCap: true, lineStyle: { width: 16, color: [[1, 'rgba(148,163,214,0.12)']] } },
      pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false },
      axisLabel: { show: false },
      detail: {
        valueAnimation: true, offsetCenter: [0, '2%'],
        formatter: '{value}', fontSize: 54, fontWeight: 500,
        fontFamily: FONT_D, color: ink
      },
      data: [{ value: last.score }]
    }, {
      type: 'gauge', startAngle: 210, endAngle: -30, min: 0, max: 100,
      radius: '78%', center: ['50%', '58%'],
      axisLine: { lineStyle: { width: 2, color: [[1, 'rgba(148,163,214,0.10)']] } },
      pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false },
      axisLabel: { show: false }, detail: { show: false },
      data: [{ value: 0 }], silent: true
    }]
  });

  /* ============================================================
     ② 阶段分布环形图（随 周/月 切换）
     ============================================================ */
  var cStages = init('chart-stages');
  function stagesOption(recs) {
    var deepM = Math.round(avg(recs.map(function (r) { return r.deepMin; })));
    var lightM = Math.round(avg(recs.map(function (r) { return r.lightMin; })));
    var remM = Math.round(avg(recs.map(function (r) { return r.remMin; })));
    var awakeM = Math.round(avg(recs.map(function (r) { return r.awakeMin; })));
    return {
      color: [deep, light, rem, awake],
      tooltip: Object.assign({}, baseTip, {
        formatter: function (p) {
          return p.marker + ' ' + p.name + '&nbsp;&nbsp;<b>' + p.value + '</b> 分钟（' + p.percent + '%）';
        }
      }),
      series: [{
        type: 'pie', radius: ['58%', '80%'], center: ['50%', '46%'],
        padAngle: 2, itemStyle: { borderRadius: 8, borderColor: '#060A13', borderWidth: 2 },
        label: { show: false }, emphasis: { scaleSize: 6 },
        data: [
          { name: '深睡', value: deepM },
          { name: '浅睡', value: lightM },
          { name: 'REM 快速眼动', value: remM },
          { name: '清醒', value: awakeM }
        ],
        animationDurationUpdate: 600
      }, {
        type: 'pie', radius: ['0%', '44%'], center: ['50%', '46%'], silent: true,
        label: {
          position: 'center', formatter: function () {
            var total = Math.round(avg(recs.map(function (r) { return r.dur * 60 - r.awakeMin; })));
            return '{v|' + Math.floor(total / 60) + 'h' + (total % 60) + 'm}\n{t|有效睡眠}';
          },
          rich: {
            v: { fontSize: 26, fontWeight: 500, color: ink, fontFamily: FONT_D },
            t: { fontSize: 11, color: muted, padding: [6, 0, 0, 0] }
          }
        },
        data: [{ value: 1, itemStyle: { color: 'transparent' } }]
      }, {
        type: 'pie', radius: ['86%', '88%'], center: ['50%', '46%'], silent: true,
        label: { show: false },
        data: [{ value: 1, itemStyle: { color: 'rgba(148,163,214,0.10)' } }]
      }]
    };
  }

  /* ============================================================
     ③ 时长 + 评分 趋势（随 周/月 切换，支持点击选中某天）
     ============================================================ */
  var cTrend = init('chart-trend');
  var curTrendRecs = records;   // 当前趋势图数据（周/月）
  var curTrendIsWeek = false;
  // 点击柱子 → 选中该天，联动所有当日卡片
  cTrend.on('click', function (p) {
    if (p.componentType !== 'series' || p.seriesName !== '睡眠时长') return;
    selectDay(records.length - curTrendRecs.length + p.dataIndex);
  });
  function trendOption(recs, isWeek, sel) {
    sel = (sel == null ? -1 : sel);
    var xs = recs.map(function (r) { return isWeek ? '周' + '日一二三四五六'[r.dow] + '\n' + r.label : r.label; });
    return {
      grid: { left: 44, right: 44, top: 44, bottom: 36 },
      legend: {
        top: 0, right: 0, itemWidth: 10, itemHeight: 10, itemGap: 18,
        textStyle: { color: muted, fontSize: 11 },
        data: ['睡眠时长', '睡眠评分']
      },
      tooltip: Object.assign({}, baseTip, {
        trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(148,163,214,0.06)' } },
        formatter: function (ps) {
          var r = recs[ps[0].dataIndex];
          var html = '<b>' + r.label + '</b>（周' + '日一二三四五六'[r.dow] + '）';
          ps.forEach(function (p) {
            html += '<br/>' + p.marker + p.seriesName + '&nbsp;&nbsp;<b>' +
              (p.seriesName === '睡眠时长' ? durText(p.value) : p.value + ' 分') + '</b>';
          });
          html += '<br/><span style="color:' + muted + '">深睡 ' + r.deepMin + ' 分 · 清醒 ' + r.awakeMin + ' 分</span>';
          return html;
        }
      }),
      xAxis: {
        type: 'category', data: xs,
        axisLine: { lineStyle: { color: rule } }, axisTick: { show: false },
        axisLabel: { color: muted, fontSize: 10, fontFamily: FONT_M, interval: isWeek ? 0 : 'auto', lineHeight: 15 }
      },
      yAxis: [
        { type: 'value', min: 0, max: 10,
          splitLine: { lineStyle: { color: 'rgba(148,163,214,0.08)' } }, axisLabel: { color: muted, fontSize: 10, fontFamily: FONT_M } },
        { type: 'value', min: 40, max: 100,
          splitLine: { show: false }, axisLabel: { color: muted, fontSize: 10, fontFamily: FONT_M } }
      ],
      series: [
        {
          name: '睡眠时长', type: 'bar', barMaxWidth: isWeek ? 26 : 12, z: 2,
          itemStyle: {
            borderRadius: [5, 5, 2, 2],
            color: function (p) {
              if (p.dataIndex === sel) return '#FFC46B';   // 选中日高亮
              return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#97A5FF' }, { offset: 1, color: 'rgba(94,110,255,0.35)' }
              ]);
            }
          },
          data: recs.map(function (r) { return +r.dur.toFixed(2); }),
          markArea: {
            silent: true, itemStyle: { color: 'rgba(86,217,207,0.07)' },
            data: [[{ yAxis: 7 }, { yAxis: 9 }]]
          },
          animationDelay: function (idx) { return idx * 22; }
        },
        {
          name: '睡眠评分', type: 'line', yAxisIndex: 1, z: 3,
          smooth: 0.42, symbol: 'circle', symbolSize: isWeek ? 8 : 5, showSymbol: isWeek,
          lineStyle: { color: amber, width: 2, shadowColor: 'rgba(255,196,107,0.35)', shadowBlur: 8 },
          itemStyle: { color: amber, borderColor: '#060A13', borderWidth: 2 },
          data: recs.map(function (r) { return r.score; })
        }
      ],
      animationDuration: 800, animationEasing: 'cubicOut'
    };
  }

  /* ============================================================
     ④ 睡眠周期时间轴（随选中日生成）
     ============================================================ */
  var cHypo = init('chart-hypo');
  var STAGE_NAME = ['深睡', '浅睡', 'REM', '清醒'];
  var STAGE_COLOR = [deep, light, rem, awake];
  var hypoState = { segs: [], awakeCount: 0, awakeTotal: 0, deepCount: 0 };
  // 按天程序化生成睡眠周期：每天周期数、深睡/REM 分布、清醒片段都会随机变化
  // （按天种子随机 → 同一天稳定，不同天结构明显不同）
  function buildHypo(idx) {
    var r = records[idx];
    var jx = mulberry32(9101 + idx * 733);
    var bedAbs = r.bed;
    var wakeAbs = bedAbs + Math.round(r.dur * 60);

    var sleepMin = r.dur * 60 - r.awakeMin;              // 有效睡眠分钟
    var cycles = Math.max(3, Math.min(5, Math.round(sleepMin / 95 + (jx() - 0.5)))); // 3-5 个周期

    // 清醒片段：0-2 段，时长相加 ≈ r.awakeMin - 晨起清醒(6-14分)
    var finalAwake = Math.round(6 + jx() * 8);
    var nightAwake = Math.max(0, r.awakeMin - finalAwake);
    var nAwake = nightAwake > 12 ? (jx() < 0.45 ? 2 : 1) : (nightAwake > 4 ? 1 : 0);

    // 各阶段总时长（从当日真实比例出发）
    var deepTotal = r.deepMin, remTotal = r.remMin, lightTotal = r.lightMin;

    // 深睡权重：前重后轻，每天随机程度不同
    var deepW = [], remW = [], dw = 0, rw = 0;
    for (var c = 0; c < cycles; c++) {
      deepW[c] = (cycles - c) * (0.6 + jx() * 0.8);      // 越靠前权重越大 + 随机
      remW[c]  = (c + 1) * (0.6 + jx() * 0.8);           // REM 越靠后越多 + 随机
      dw += deepW[c]; rw += remW[c];
    }
    var segs = [];
    var t = bedAbs;
    var push = function (stage, dur) {
      dur = Math.round(dur);
      if (dur < 3) return;
      segs.push([t, t + dur, stage]); t += dur;
    };

    // 入睡阶段（浅睡）
    push(1, lightTotal * (0.06 + jx() * 0.08));

    // 已分配的浅睡 / 深睡 / REM / 清醒 计数
    var deepLeft = deepTotal, remLeft = remTotal, lightLeft = Math.max(0, lightTotal - (segs.length ? segs[0][1] - segs[0][0] : 0));
    var awakeLeft = nightAwake, ac = 0, dc = 0;

    for (var ci = 0; ci < cycles; ci++) {
      var lastCycle = ci === cycles - 1;
      // 深睡段
      var deepD = lastCycle ? deepLeft * (jx() < 0.5 ? 1 : 0.4) : deepTotal * deepW[ci] / dw;
      deepD = Math.min(deepD, deepLeft);
      push(0, deepD); deepLeft -= deepD; if (deepD >= 3) dc++;
      // 浅睡段（随机时长）
      var lightD = lastCycle ? lightLeft : lightTotal * (0.10 + jx() * 0.16);
      lightD = Math.min(lightD, lightLeft);
      push(1, lightD); lightLeft -= lightD;
      // REM 段
      var remD = lastCycle ? remLeft : remTotal * remW[ci] / rw;
      remD = Math.min(remD, remLeft);
      push(2, remD); remLeft -= remD;
      // 中途清醒（随机插在非首周期）
      if (!lastCycle && ac < nAwake && jx() < 0.75 && awakeLeft > 3) {
        var ad = Math.min(awakeLeft, 4 + jx() * (nightAwake / nAwake));
        push(3, ad); awakeLeft -= ad; ac++;
      }
    }
    // 剩余阶段补到尾部（浅睡/REM）
    if (lightLeft > 3) push(1, lightLeft);
    if (remLeft > 3) push(2, remLeft);
    if (deepLeft > 3) push(0, deepLeft);

    // 按比例拉伸到实际睡眠窗口
    var span = t - bedAbs;
    var target = wakeAbs - bedAbs - finalAwake;
    var k = target / span;
    segs.forEach(function (s) {
      s[0] = bedAbs + Math.round((s[0] - bedAbs) * k);
      s[1] = bedAbs + Math.round((s[1] - bedAbs) * k);
    });
    // 去重叠 & 填缝
    for (var i = 1; i < segs.length; i++) if (segs[i][0] < segs[i - 1][1]) segs[i][0] = segs[i - 1][1];
    segs.push([segs[segs.length - 1][1], wakeAbs, 3]);   // 晨起清醒段

    hypoState = {
      segs: segs,
      awakeCount: ac,
      awakeTotal: Math.round(awakeTotalSafe(segs)),
      deepCount: dc
    };
  }
  function awakeTotalSafe(segs) {
    var sum = 0;
    for (var i = 0; i < segs.length - 1; i++) if (segs[i][2] === 3) sum += segs[i][1] - segs[i][0];
    return sum;
  }
  function hypoOption() {
    return {
      grid: { left: 50, right: 16, top: 14, bottom: 40 },
      tooltip: Object.assign({}, baseTip, {
        formatter: function (p) {
          var s = hypoState.segs[p.dataIndex];
          return p.marker + ' ' + STAGE_NAME[s[2]] + '&nbsp;&nbsp;<b>' + mm(s[0]) + ' — ' + mm(s[1]) + '</b>&nbsp;（' + (s[1] - s[0]) + ' 分）';
        }
      }),
      xAxis: {
        type: 'value', min: 1320, max: 1900, interval: 60,
        axisLabel: { color: muted, fontSize: 10, fontFamily: FONT_M, formatter: function (v) { return mm(v); } },
        axisLine: { show: false }, splitLine: { show: false }
      },
      yAxis: {
        type: 'category', data: ['深睡', '浅睡', 'REM', '清醒'],
        axisLabel: { color: muted, fontSize: 11 },
        axisLine: { show: false }, axisTick: { show: false },
        splitArea: { show: false }
      },
      series: [{ type: 'custom', renderItem: renderItemSeg, data: hypoState.segs, clip: true }]
    };
  }
  function renderItemSeg(params, api) {
    var s = hypoState.segs[params.dataIndex];
    var start = api.coord([s[0], s[2]]);
    var end = api.coord([s[1], s[2]]);
    var h = api.size([0, 1])[1] * 0.58;
    return {
      type: 'rect',
      shape: { x: start[0], y: start[1] - h / 2, width: Math.max(end[0] - start[0] - 3, 3), height: h, r: 5 },
      style: { fill: STAGE_COLOR[s[2]], opacity: s[2] === 3 ? 0.55 : 0.92 }
    };
  }
  buildHypo(records.length - 1);
  cHypo.setOption(hypoOption());

  /* ============================================================
     ⑤ 夜间心率 & 呼吸（随选中日生成）
     ============================================================ */
  var cVitals = init('chart-vitals');
  function vitalsOption(idx) {
    var r = records[idx];
    var rnd = mulberry32(8848 + idx * 131);              // 每天曲线不同但稳定
    var bedAbs = r.bed, endAbs = bedAbs + Math.round(r.dur * 60);
    var hr = [], br = [];
    for (var t = bedAbs; t <= endAbs; t += 10) {
      var ph = (t - bedAbs) / Math.max(endAbs - bedAbs, 60);
      hr.push([t, +(r.rhr + 7 - 7.5 * Math.sin(Math.PI * ph) + (rnd() - 0.5) * 2.2).toFixed(1)]);
      br.push([t, +(r.br + 0.3 - 1.35 * Math.sin(Math.PI * ph) + (rnd() - 0.5) * 0.5).toFixed(1)]);
    }
    var yMin = Math.max(40, Math.floor((r.rhr - 3) / 6) * 6);
    return {
      grid: { left: 40, right: 14, top: 30, bottom: 30 },
      legend: { top: 0, right: 0, itemWidth: 12, itemHeight: 3, textStyle: { color: muted, fontSize: 11 }, data: ['心率 bpm', '呼吸 次/分'] },
      tooltip: Object.assign({}, baseTip, {
        trigger: 'axis',
        formatter: function (ps) {
          var html = '<b>' + mm(ps[0].value[0]) + '</b>';
          ps.forEach(function (p) { html += '<br/>' + p.marker + p.seriesName + '&nbsp;&nbsp;<b>' + p.value[1] + '</b>'; });
          return html;
        }
      }),
      xAxis: {
        type: 'value', min: Math.floor(bedAbs / 60) * 60, max: Math.ceil(endAbs / 60) * 60, interval: 90,
        axisLabel: { color: muted, fontSize: 10, fontFamily: FONT_M, formatter: function (v) { return mm(v); } },
        axisLine: { show: false }, splitLine: { show: false }
      },
      yAxis: {
        type: 'value', min: yMin, max: yMin + 24, interval: 6,
        splitLine: { lineStyle: { color: 'rgba(148,163,214,0.08)' } },
        axisLabel: { color: muted, fontSize: 10, fontFamily: FONT_M }
      },
      series: [
        {
          name: '心率 bpm', type: 'line', smooth: 0.5, symbol: 'none',
          lineStyle: { color: awake, width: 2, shadowColor: 'rgba(255,158,122,0.3)', shadowBlur: 8 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(255,158,122,0.22)' }, { offset: 1, color: 'rgba(255,158,122,0)' }
            ])
          },
          data: hr, animationDuration: 900
        },
        {
          name: '呼吸 次/分', type: 'line', smooth: 0.5, symbol: 'none',
          lineStyle: { color: accent2, width: 1.6, type: [5, 4] },
          data: br, animationDuration: 1100
        }
      ]
    };
  }
  cVitals.setOption(vitalsOption(records.length - 1));

  /* ============================================================
     ⑥ 入睡时间规律散点
     ============================================================ */
  var cReg = init('chart-reg');
  cReg.on('click', function (p) {
    if (p.componentType === 'series' && p.data && p.data.rIdx != null) selectDay(p.data.rIdx);
  });
  function regOption(sel) {
    sel = (sel == null ? -1 : sel);
    var pts = records.map(function (r, i) {
      return { label: r.label, bed: r.bed, isWk: r.isWeekend, rIdx: i };
    });
    var mk = function (p) {
      if (p.rIdx === sel) return { value: [p.label, p.bed], rIdx: p.rIdx, symbolSize: 13, itemStyle: { borderColor: '#FFC46B', borderWidth: 2.5 } };
      return { value: [p.label, p.bed], rIdx: p.rIdx };
    };
    return {
      grid: { left: 52, right: 14, top: 18, bottom: 30 },
      tooltip: Object.assign({}, baseTip, {
        formatter: function (p) {
          var r = records[p.data.rIdx];
          return '<b>' + r.label + '</b>（周' + '日一二三四五六'[r.dow] + '）<br/>入睡 <b>' + mm(r.bed) + '</b>' +
            (r.isWeekend ? ' · 周末' : ' · 工作日');
        }
      }),
      xAxis: {
        type: 'category', data: records.map(function (r) { return r.label; }),
        axisLabel: { color: muted, fontSize: 9, fontFamily: FONT_M, interval: 4 },
        axisLine: { lineStyle: { color: rule } }, axisTick: { show: false }
      },
      yAxis: {
        type: 'value', min: 1330, max: 1500, interval: 30,
        axisLabel: { color: muted, fontSize: 10, fontFamily: FONT_M, formatter: function (v) { return mm(v); } },
        splitLine: { lineStyle: { color: 'rgba(148,163,214,0.08)' } }
      },
      series: [
        {
          type: 'scatter', symbolSize: 9,
          itemStyle: { color: accent, opacity: 0.85, borderColor: '#060A13', borderWidth: 1.5 },
          data: pts.filter(function (p) { return !p.isWk; }).map(mk),
          animationDelay: function (i) { return i * 30; }
        },
        {
          type: 'scatter', symbolSize: 9,
          itemStyle: { color: amber, opacity: 0.9, borderColor: '#060A13', borderWidth: 1.5 },
          data: pts.filter(function (p) { return p.isWk; }).map(mk)
        },
        {
          type: 'line', silent: true, symbol: 'none', lineStyle: { color: accent2, width: 1.4, type: [4, 4], opacity: 0.7 },
          data: records.map(function () { return 1405; }),
          markPoint: {
            symbol: 'rect', symbolSize: [0, 0],
            label: { show: true, position: 'insideEndTop', color: accent2, fontSize: 10, formatter: '均值 23:25' },
            data: [{ coord: ['10.24', 1405] }]
          }
        }
      ]
    };
  }

  /* ============================================================
     ⑦ 30 天质量日历热力图
     ============================================================ */
  var cHeat = init('chart-heat');
  cHeat.on('click', function (p) {
    if (!p.value || p.value[3] == null) return;
    for (var i = 0; i < records.length; i++) {
      if (records[i].label === p.value[3]) { selectDay(i); break; }
    }
  });
  function heatData(sel) {
    var cells = [], weekIdx = -1;
    records.forEach(function (r, idx) {
      var dow = (r.date.getDay() + 6) % 7;
      if (idx === 0) weekIdx = 0; else if (dow === 0) weekIdx++;
      var cell = [weekIdx, dow, r.score, r.label, r.dur];
      cells.push(idx === sel
        ? { value: cell, itemStyle: { borderColor: '#FFC46B', borderWidth: 2.5, shadowBlur: 10, shadowColor: 'rgba(255,196,107,0.6)' } }
        : cell);
    });
    var weeks = weekIdx + 1;
    for (var w = 0; w < weeks; w++) {
      for (var dd = 0; dd < 7; dd++) {
        if (!cells.some(function (c) { var v = c.value || c; return v[0] === w && v[1] === dd; })) cells.push([w, dd, '-']);
      }
    }
    return { cells: cells, weeks: weeks };
  }
  var heat = heatData(-1);
  var weekLabels = [];
  (function () {
    var first = new Date(2026, 8, 25); // 起始周可能更早，取 records 首日所在周的周一
    var f = new Date(records[0].date); f.setDate(f.getDate() - ((f.getDay() + 6) % 7));
    for (var w = 0; w < heat.weeks; w++) {
      var m = new Date(f); m.setDate(m.getDate() + w * 7);
      weekLabels.push((m.getMonth() + 1) + '/' + m.getDate());
    }
  })();
  function heatOption(sel) {
    return {
      grid: { left: 34, right: 12, top: 8, bottom: 26 },
      tooltip: Object.assign({}, baseTip, {
        formatter: function (p) {
          var v = p.value.value || p.value;
          if (v[2] === '-') return '无记录';
          return '<b>' + v[3] + '</b><br/>评分 <b>' + v[2] + '</b> 分 · 时长 ' + durText(v[4]);
        }
      }),
      xAxis: {
        type: 'category', data: weekLabels, position: 'top',
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: muted, fontSize: 10, fontFamily: FONT_M }
      },
      yAxis: {
        type: 'category', data: ['一', '二', '三', '四', '五', '六', '日'], inverse: true,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: muted, fontSize: 11 }
      },
      visualMap: {
        show: false, min: 55, max: 100,
        inRange: { color: ['#161D33', '#2E3B7E', '#5E6EFF', '#97A5FF', '#C7D2FF'] }
      },
      series: [{
        type: 'heatmap',
        data: heatData(sel).cells,
        itemStyle: { borderRadius: 7, borderColor: '#060A13', borderWidth: 4 },
        label: {
          show: true, fontSize: 10, fontFamily: FONT_M, color: 'rgba(233,238,249,0.8)',
          formatter: function (p) {
            var v = p.value.value || p.value;
            return v[2] === '-' ? '' : v[2];
          }
        },
        emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(151,165,255,0.5)' } },
        animationDurationUpdate: 300
      }]
    };
  }
  cHeat.setOption(heatOption(-1));

  /* ============================================================
     汇总 · 洞察 · KPI 更新
     ============================================================ */
  function el(id) { return document.getElementById(id); }

  function renderStats(recs, name) {
    var avgScore = Math.round(avg(recs.map(function (r) { return r.score; })));
    var avgDur = avg(recs.map(function (r) { return r.dur; }));
    var avgDeep = Math.round(avg(recs.map(function (r) { return r.deepMin; })));
    var best = recs.reduce(function (a, b) { return b.score > a.score ? b : a; });
    var reach = recs.filter(function (r) { return r.dur >= 7; }).length;
    var pct = Math.round(reach / recs.length * 100);

    el('summaryTitle').textContent = '周期汇总';
    el('summarySub').textContent = name;
    el('statScore').innerHTML = avgScore + '<small> 分</small>';
    el('statDur').innerHTML = avgDur.toFixed(1) + '<small> 小时</small>';
    el('statDeep').innerHTML = avgDeep + '<small> 分钟</small>';
    el('statBest').innerHTML = best.label + '<small id="statBestScore"> · ' + best.score + ' 分</small>';
    el('reachPct').textContent = pct + '%（' + reach + '/' + recs.length + ' 天）';
    requestAnimationFrame(function () { el('reachFill').style.width = pct + '%'; });
  }

  function renderInsights(recs) {
    var wk = recs.filter(function (r) { return !r.isWeekend; });
    var we = recs.filter(function (r) { return r.isWeekend; });
    var lateMin = we.length && wk.length ? Math.round(avg(we.map(function (r) { return r.bed; })) - avg(wk.map(function (r) { return r.bed; }))) : 0;
    var avgScore = Math.round(avg(recs.map(function (r) { return r.score; })));
    var avgDeep = Math.round(avg(recs.map(function (r) { return r.deepMin; })));
    var deepPct = Math.round(avg(recs.map(function (r) { return r.deepMin / (r.dur * 60 - r.awakeMin); })) * 100);
    var last7 = recs.slice(-7), prev7 = recs.slice(-14, -7);
    var delta = Math.round(avg(last7.map(function (r) { return r.score; })) - avg(prev7.map(function (r) { return r.score; })));
    var items = [];

    items.push({
      c: accent2,
      html: '平均睡眠评分 <b>' + avgScore + ' 分</b>，近 7 天较前 7 天' +
        (delta >= 0 ? '<b style="color:var(--good)">上升 ' + delta + ' 分</b>' : '<b style="color:var(--awake)">下降 ' + Math.abs(delta) + ' 分</b>') +
        '<span class="tip">保持当前的作息节奏，评分有望稳步向上。</span>'
    });
    items.push({
      c: amber,
      html: '周末平均比工作日<b>晚 ' + lateMin + ' 分钟</b>入睡<span class="tip">社交时差会拖累周一状态，周末入睡建议不要超过 0 点。</span>'
    });
    items.push({
      c: deep,
      html: '深睡平均 <b>' + avgDeep + ' 分钟</b>，占有效睡眠 ' + deepPct + '%' +
        (deepPct >= 18 ? '<span class="tip">高于 18% 的参考线，身体修复状态不错。</span>' : '<span class="tip">略低于 18% 参考线，可尝试睡前减少屏幕与咖啡因。</span>')
    });
    items.push({
      c: accent,
      html: '入睡时间波动最大的一天相差 <b>' + (Math.max.apply(null, recs.map(function (r) { return r.bed; })) - Math.min.apply(null, recs.map(function (r) { return r.bed; }))) + ' 分钟</b><span class="tip">规律比时长更关键，建议把就寝时间锚定在 ±30 分钟内。</span>'
    });

    el('insightsList').innerHTML = items.map(function (it) {
      return '<div class="insight-item"><span class="i-dot" style="background:' + it.c + '"></span><span>' + it.html + '</span></div>';
    }).join('');
  }

  /* ---------- 选中日状态与联动 ---------- */
  var selIdx = records.length - 1;   // 当前选中日（默认昨夜）

  function prevAvg(idx, key) {       // 某指标前 7 天均值（不含当天）
    var prev = records.slice(Math.max(0, idx - 7), idx);
    if (!prev.length) return records[idx][key];
    return avg(prev.map(function (x) { return x[key]; }));
  }

  function renderKpi(idx) {
    var r = records[idx];
    var isLast = idx === records.length - 1;
    el('kpiTitle').textContent = isLast ? '昨夜概览' : '当日概览';
    el('lastSub').textContent = isLast
      ? mm(r.bed) + ' 上床 → ' + mm(r.wake) + ' 醒'
      : r.label + '（周' + '日一二三四五六'[r.dow] + '）';
    el('kpiBed').textContent = mm(r.bed);
    el('kpiWake').textContent = mm(r.wake);
    var total = Math.round(r.dur * 60);
    el('kpiDur').innerHTML = Math.floor(total / 60) + '<small>小时</small>' + (total % 60) + '<small>分</small>';
    el('kpiAwake').innerHTML = hypoState.awakeCount + '<small>次 · ' + hypoState.awakeTotal + ' 分</small>';
    el('hypoSub').textContent = hypoState.deepCount + ' 段深睡 · 集中在前半夜';

    function delta(diff, goodWhenUp) {
      var cls = (diff >= 0) === goodWhenUp ? 'up' : 'down';
      return '<b class="' + cls + '">' + (diff >= 0 ? '+' : '−') + Math.abs(diff) + '</b>';
    }
    el('kpiBedDelta').innerHTML = '较 7 日均值 ' + delta(Math.round(r.bed - prevAvg(idx, 'bed')), false) + ' 分';
    el('kpiWakeDelta').innerHTML = '较 7 日均值 ' + delta(Math.round(r.wake - prevAvg(idx, 'wake')), false) + ' 分';
    el('kpiDurDelta').innerHTML = '较 7 日均值 ' + delta(Math.round((r.dur - prevAvg(idx, 'dur')) * 60), true) + ' 分';
    el('kpiAwakeDelta').innerHTML = '较 7 日均值 ' + delta(Math.round(r.awakeMin - prevAvg(idx, 'awakeMin')), false) + ' 分';
  }

  function renderScoreDelta(idx) {
    var r = records[idx];
    var diff = r.score - Math.round(prevAvg(idx, 'score'));
    var beat = Math.min(96, Math.max(18, Math.round((r.score - 50) * 2.2)));
    el('scoreDelta').innerHTML = '较前 7 日均值 ' +
      (diff >= 0 ? '<b>↑ ' + diff + ' 分</b>' : '<b class="down">↓ ' + Math.abs(diff) + ' 分</b>') +
      ' · 优于 ' + beat + '% 的夜晚';
    el('scoreGrade').textContent = gradeOf(r.score);
  }

  function updateDayTitles(idx) {
    var r = records[idx];
    var isLast = idx === records.length - 1;
    el('scoreTitle').textContent = isLast ? '昨晚睡眠评分' : '当晚睡眠评分';
    el('scoreSub').textContent = r.label + ' 夜';
    el('hypoTitle').textContent = isLast ? '昨夜睡眠周期' : '当夜睡眠周期';
    el('vitalsSub').textContent = isLast ? '昨晚' : r.label;
  }

  function renderDayInsight(idx) {
    var r = records[idx];
    var deepPct = Math.round(r.deepMin / (r.dur * 60 - r.awakeMin) * 100);
    var eff = Math.round((r.dur * 60 - r.awakeMin) / (r.dur * 60) * 100);
    var bedDiff = Math.round(r.bed - prevAvg(idx, 'bed'));
    var dScore = r.score - Math.round(prevAvg(idx, 'score'));
    var items = [];

    items.push({
      c: accent2,
      html: '当晚评分 <b>' + r.score + ' 分</b>（' + gradeOf(r.score) + '），较前 7 日均值' +
        (dScore >= 0 ? '<b style="color:var(--good)">高 ' + dScore + ' 分</b>' : '<b style="color:var(--awake)">低 ' + Math.abs(dScore) + ' 分</b>') +
        '<span class="tip">' + (r.dur >= 7.5 ? '时长充足，恢复状态较好。' : '时长略短，当晚身体仍在负荷中。') + '</span>'
    });
    items.push({
      c: deep,
      html: '深睡 <b>' + r.deepMin + ' 分钟</b>，占有效睡眠 ' + deepPct + '%' +
        (deepPct >= 18 ? '<span class="tip">深睡比例达标，前半夜的修复窗口利用得不错。</span>' : '<span class="tip">深睡略薄，可试试 22 点后调暗灯光。</span>')
    });
    items.push({
      c: amber,
      html: '入睡 ' + mm(r.bed) + '，比个人均值' + (bedDiff >= 0 ? '<b>晚 ' + bedDiff + ' 分钟</b>' : '<b>早 ' + Math.abs(bedDiff) + ' 分钟</b>') +
        (r.isWeekend ? '<span class="tip">周末作息漂移正常，别连续两晚熬夜即可。</span>' : '<span class="tip">工作日尽量锚定在均值 ±30 分钟内。</span>')
    });
    items.push({
      c: accent,
      html: '睡眠效率 <b>' + eff + '%</b>，夜间清醒 ' + hypoState.awakeCount + ' 次（' + hypoState.awakeTotal + ' 分）' +
        '<span class="tip">' + (eff >= 95 ? '连续性很好，几乎没有碎片觉醒。' : '效率尚可；白天犯困可补 20 分钟午睡。') + '</span>'
    });

    el('insightsList').innerHTML = items.map(function (it) {
      return '<div class="insight-item"><span class="i-dot" style="background:' + it.c + '"></span><span>' + it.html + '</span></div>';
    }).join('');
  }

  function setInsightMode(idx, name) {
    var isLast = idx === records.length - 1;
    el('insightTitle').textContent = isLast ? '睡眠洞察' : '单日解读';
    el('insightSub').textContent = isLast ? name : records[idx].label + ' · 点击图表可切换日期';
    el('insightBack').style.display = isLast ? 'none' : '';
  }

  /* ---------- 选中某一天 → 全卡片联动 ---------- */
  function selectDay(idx) {
    if (idx == null || idx < 0 || idx >= records.length) return;
    selIdx = idx;
    var r = records[idx];
    var name = curTrendIsWeek ? '基于近 7 天' : '基于近 30 天';

    cGauge.setOption({ series: [{ data: [{ value: r.score }] }] });
    renderScoreDelta(idx);
    updateDayTitles(idx);
    buildHypo(idx);              // 先生成当天周期，KPI 依赖 hypoState
    renderKpi(idx);
    cHypo.setOption(hypoOption());
    cVitals.setOption(vitalsOption(idx));
    cReg.setOption(regOption(idx));
    cHeat.setOption(heatOption(idx));
    cTrend.setOption(trendOption(curTrendRecs, curTrendIsWeek, idx - (records.length - curTrendRecs.length)));
    setInsightMode(idx, name);
    if (idx === records.length - 1) renderInsights(curTrendRecs);
    else renderDayInsight(idx);
  }
  el('insightBack').addEventListener('click', function () { selectDay(records.length - 1); });

  /* ============================================================
     周 / 月 切换
     ============================================================ */
  var mode = 'month';
  function applyMode(m) {
    mode = m;
    var isWeek = m === 'week';
    var recs = isWeek ? records.slice(-7) : records;
    var name = isWeek ? '近 7 天' : '近 30 天';
    curTrendRecs = recs;
    curTrendIsWeek = isWeek;

    el('btnWeek').classList.toggle('active', isWeek);
    el('btnMonth').classList.toggle('active', !isWeek);
    el('btnWeek').setAttribute('aria-selected', isWeek);
    el('btnMonth').setAttribute('aria-selected', !isWeek);
    el('rangeLabel').textContent = name;
    el('trendSub').textContent = name + ' · 青色带为 7–9h 理想区间';
    el('stagesSub').textContent = isWeek ? '近 7 天均值' : '30 天均值';

    cTrend.setOption(trendOption(recs, isWeek, selIdx - (records.length - recs.length)));
    cStages.setOption(stagesOption(recs));
    cReg.setOption(regOption(selIdx));
    renderStats(recs, name);
    if (selIdx === records.length - 1) renderInsights(recs);
  }
  el('btnWeek').addEventListener('click', function () { applyMode('week'); });
  el('btnMonth').addEventListener('click', function () { applyMode('month'); });

  /* ---------- 首次渲染 ---------- */
  renderScoreDelta(selIdx);
  renderKpi(selIdx);
  updateDayTitles(selIdx);
  applyMode('month');

  /* 调试/自动化测试钩子（不影响页面） */
  window.__sleep = { selectDay: selectDay, records: records };
})();
