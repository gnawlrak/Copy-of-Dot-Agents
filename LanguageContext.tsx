import React, { createContext, useContext, useState } from 'react';

export type Language = 'en' | 'zh';

export const DICTIONARY = {
  en: {
    // Main Menu
    appName: "DOT AGENTS",
    subTitle: "Close-Quarters Battle Simulation",
    totalScore: "Total Score",
    highScore: "High Score",
    startMission: "START MISSION",
    multiplayer: "MULTIPLAYER",
    loadout: "LOADOUT",
    mapEditor: "MAP EDITOR",
    syncing: "Syncing cloud profile...",
    savedLocally: "Saved locally.",
    saveError: "Save error occurred.",

    // Loadout Menu
    loadoutTitle: "OPERATOR LOADOUT",
    weapons: "WEAPONS",
    throwables: "THROWABLES",
    back: "BACK",
    customize: "CUSTOMIZE",
    equipped: "EQUIPPED",
    equip: "EQUIP",
    attachments: "ATTACHMENTS",
    noAttachments: "No muzzle/optic attachments available for this weapon category",
    damage: "Damage",
    fireRate: "Fire Rate",
    rpm: "RPM",
    magSize: "Mag Size",
    reload: "Reload",

    // Level Select
    levelSelectTitle: "SELECT MISSION SITE",
    playSolo: "PLAY SOLO (TRAINING)",
    difficultySimple: "Simple (No enemies, learning controls)",
    difficultyNormal: "Normal (Standard CQB training layout)",
    difficultyHard: "Hard (Reinforced defenses; extreme threat)",
    selectLevel: "Select Level",

    // Weapon Mod Menu
    modTitle: "WEAPON CUSTOMIZATION",
    statsPreview: "STATS PREVIEW",
    recoil: "Recoil Control",
    noise: "Sound Signature",
    capacity: "Magazine Capacity",
    sec: "s",
    m: "m",
    selectSlot: "Select Attachment Slot",
    reset: "RESET TO DEFAULT",
    backToLoadout: "BACK TO LOADOUT",

    // Control Customizer
    controlTitle: "CONTROL CONFIGURATOR",
    globalScale: "Global Button Scale",
    opacity: "Button Opacity",
    resetPositions: "RESET POSITIONS",
    saveAndExit: "SAVE & EXIT",

    // Lobby
    mpLobby: "TACTICAL MULTIPLAYER LOBBY",
    activeRooms: "Active Rooms",
    noRooms: "No combat rooms active in the sector. Command a new one or refresh.",
    createRoom: "Command New Room",
    roomNamePlaceholder: "Room Name...",
    refreshRooms: "Refresh Signals",
    joining: "Connecting...",
    joinRoom: "Join Room",
    players: "Players",
    teamSelection: "ASSIGN INTEL ROUTE (TEAM)",
    teamRed: "Assault (Red)",
    teamBlue: "Defenders (Blue)",
    readyBtn: "READY FOR INSERTION",
    notReadyBtn: "STANDBY",
    roomStatusWaiting: "WAITING FOR AGENTS",
    roomStatusPlaying: "ACTIVE OPERATION",
    backToMenu: "RETURN TO HQ",

    // Pause & Settings
    paused: "OPERATION PAUSED",
    resume: "RESUME",
    quit: "QUIT TO HQ",
    vibration: "TACTILE FEEDBACK",
    sfx: "SFX VOLUME",
    music: "MUSIC VOLUME",
    showTouchControls: "MOBILE CONTROLS OVERLAY",
    touchControlsBtn: "CUSTOMIZE HUD LAYOUT",

    // In-game overlays
    interactiveDoor: "TAP / [E] TO INTERACT WITH DOOR",
    died: "WOUNDED IN ACTION",
    missionSuccess: "MISSION ACCOMPLISHED",
    respawnIn: "Respawning in...",
    pressToRespawn: "Tap anywhere to redeploy",
    redTeamWon: "ASSAULT TEAM WON!",
    blueTeamWon: "DEFENDING TEAM WON!",
    tieGame: "OPERATION DRAW!",
    kills: "KILLS",
    deaths: "DEATHS",
    score: "SCORE",
    ammo: "AMMO",
    health: "HEALTH",
    armor: "ARMOR",
    shield: "SHIELD",
    extraction: "EXTRACTION",
    enemyDensity: "ENEMY DENSITY",
    missionTime: "MISSION TIME",
    projectedTotal: "PROJECTED TOTAL",
    takedown: "[E] TAKEDOWN",
    interact: "[E] INTERACT",
    locked: "LOCKED",
    host: "HOST",
    client: "SIGNAL STRENGTH",
  },
  zh: {
    // 主菜单
    appName: "点线特工",
    subTitle: "室内近距离战斗 (CQB) 真实模拟器",
    totalScore: "总积分",
    highScore: "历史最高分",
    startMission: "开始行动",
    multiplayer: "多人对战",
    loadout: "战术配装",
    mapEditor: "地图编辑器",
    syncing: "正在同步云端档案...",
    savedLocally: "档案已保存在本地",
    saveError: "档案同步出错",

    // 装备配置菜单
    loadoutTitle: "干员战术配装",
    weapons: "武器装备",
    throwables: "投掷/战术装备",
    back: "返回",
    customize: "配件改装",
    equipped: "已装备",
    equip: "装备",
    attachments: "受支持配件",
    noAttachments: "此武器类别不支持安装瞄具/枪口/握把配件",
    damage: "单发伤害",
    fireRate: "射速/循环",
    rpm: "RPM",
    magSize: "弹匣容量",
    reload: "装填时间",

    // 关卡选择
    levelSelectTitle: "选择任务派遣地域",
    playSolo: "单兵推演 (模拟训练)",
    difficultySimple: "简单 (无敌方人员, 熟悉移动与开火)",
    difficultyNormal: "普通 (标准 CQB 战术推演布局)",
    difficultyHard: "困难 (敌方设防严密; 极高交火烈度)",
    selectLevel: "选择关卡",

    // 武器改装菜单
    modTitle: "武器模块化改装",
    statsPreview: "战术性能预估",
    recoil: "散布/后坐力",
    noise: "音量传播范围",
    capacity: "弹匣容弹量",
    sec: "秒",
    m: "米",
    selectSlot: "选择配件槽位",
    reset: "恢复出厂设置",
    backToLoadout: "返回战术配装",

    // 触摸键自定义
    controlTitle: "HUD 触摸案件布局自定义",
    globalScale: "按钮全局缩放",
    opacity: "按钮透明度",
    resetPositions: "重置所有位置",
    saveAndExit: "保存并退出",

    // 多人游戏大厅
    mpLobby: "联合作战指挥中心",
    activeRooms: "活跃战区",
    noRooms: "该区域暂无活跃战术房间。请创建或刷新信号。",
    createRoom: "打开新房间",
    roomNamePlaceholder: "输入房间名称...",
    refreshRooms: "刷新卫星信号",
    joining: "正在建立战术链接...",
    joinRoom: "加入战区",
    players: "干员数量",
    teamSelection: "分配破门/战术路线",
    teamRed: "红组: 突击组 (Assault)",
    teamBlue: "蓝组: 防守组 (Defenders)",
    readyBtn: "准备突入 (READY)",
    notReadyBtn: "待命状态 (STANDBY)",
    roomStatusWaiting: "等待干员集结",
    roomStatusPlaying: "战术行动中",
    backToMenu: "撤回总部",

    // 暂停与设置
    paused: "行动暂停",
    resume: "继续任务",
    quit: "撤销行动并返回",
    vibration: "触觉细微震动",
    sfx: "音效音量",
    music: "背景音乐音量",
    showTouchControls: "屏幕虚拟操控面板",
    touchControlsBtn: "自定义虚拟按键布局",

    // 游戏内UI
    interactiveDoor: "靠近点击 / 按 [E] 进行破门/开关",
    died: "干员重伤倒地 (WIA)",
    missionSuccess: "任务顺利完成!",
    respawnIn: "距离干员重新部署:",
    pressToRespawn: "点击任意位置重新部署",
    redTeamWon: "红队 (突击组) 胜利！",
    blueTeamWon: "蓝队 (防守组) 胜利！",
    tieGame: "战术平局 (双亡)！",
    kills: "击杀",
    deaths: "阵亡",
    score: "当前积分",
    ammo: "当前弹药",
    health: "干员体征",
    armor: "辅助装甲",
    shield: "防爆盾件",
    extraction: "撤离区",
    enemyDensity: "敌人密度",
    missionTime: "行动耗时",
    projectedTotal: "结算预测总分",
    takedown: "[E] 秘密处决",
    interact: "[E] 进行互动",
    locked: "已锁闭",
    host: "房主",
    client: "战术链接",
  }
};

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof DICTIONARY.en) => string;
}>({
  language: 'zh',
  setLanguage: () => {},
  t: (key) => DICTIONARY.zh[key] || DICTIONARY.en[key] || String(key),
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('dot_agents_lang');
      if (saved === 'en' || saved === 'zh') {
        return saved;
      }
    } catch {}
    return 'zh';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('dot_agents_lang', lang);
    } catch {}
  };

  const t = (key: keyof typeof DICTIONARY.en) => {
    return DICTIONARY[language]?.[key] || DICTIONARY.en[key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
