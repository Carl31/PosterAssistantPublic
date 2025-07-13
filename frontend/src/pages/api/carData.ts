// carData.ts

export type CarData = {
  [make: string]: string[];
};

export function modelExists(make: string, model: string): boolean {
  const models = carData[make.toUpperCase()];
  if (!models) return false;

  return models.includes(model.toLowerCase());
}

export const carData: CarData = {
  LEXUS: [
    "ct", "es", "gs", "gs f", "hs", "is", "is f", "lc", "lfa", "ls", "lx",
    "nx", "rc", "rc f", "rx", "sc", "ux"
  ],
  TOYOTA: [
    "86", "allex", "allion", "alphard", "alphard g", "alphard hybrid", "alphard v",
    "altezza", "altezza gita", "aqua", "aristo", "auris", "avalon", "avensis sedan",
    "avevsis wagon", "belta", "blade", "brevis", "bz4x", "bb", "caldina", "cami",
    "camry", "camry gracia", "camry gracia sedan", "camry gracia stationwagon",
    "carina", "carina ed", "carina surf", "cavalier", "celica", "celsior",
    "century", "chaser", "chr", "copen", "corolla", "corollasport", "corolla axio",
    "corolla ceres", "corolla cross", "corolla fielder", "corolla fx", "corolla ii",
    "corolla levin", "corolla rumion", "corolla runx", "corolla spacio",
    "corolla touring", "corolla touring wagon", "corolla wagon", "corona",
    "corona exiv", "corona premio", "corona sf", "corsa", "cresta", "crown",
    "crown crossover", "crown estate", "crown hybrid", "crown majesta",
    "crown stationwagon", "curren", "cynos", "duet", "esquire", "estima",
    "estima emina", "estima hybrid", "estima l", "estima lucida", "estima t",
    "fj cruiser", "funcargo", "gaia", "gr86", "granace", "grand hiace", "granvia",
    "grmn yaris", "gr corolla", "gr yaris", "harrier", "harrier hybrid",
    "harrier phev", "hiace regius", "hiace wagon", "hilux", "hilux pick up",
    "hilux sports pick up", "hilux surf", "ipsum", "iq", "isis", "ist",
    "kluger hybrid", "kluger l", "kluger v", "land cruiser", "land cruiser 100",
    "land cruiser 60", "land cruiser 70", "land cruiser 80", "land cruiser prado",
    "liteace noah", "liteace wagon", "markii blit", "markii qualis", "markii wagon",
    "mark ii", "mark x", "mark x zio", "master ace surf", "mega cruiser", "mirai",
    "mr2", "mrs", "nadia", "noah", "opa", "origin", "passo", "passo sette",
    "pixis epoch", "pixis joy", "pixis mega", "pixis space", "platz", "porte",
    "premio", "prius", "prius alpha", "prius phv", "probox wagon", "progres",
    "pronard", "ractis", "raize", "raum", "rav4", "rav4j", "rav4l", "rav4 phv",
    "regius", "roomy", "rush", "sai", "scepter coupe", "scepter sedan",
    "scepter stationwagon", "sera", "sienta", "soarer", "spade", "sparky",
    "sprinter", "sprinter carib", "sprinter cielo", "sprinter marino",
    "sprinter trueno", "sprinter wagon", "starlet", "succeed wagon", "supra",
    "tank", "tercel", "touring hiace", "townace noah", "townace wagon",
    "vanguard", "vellfire", "vellfire hybrid", "verossa", "vista", "vista ardeo",
    "vitz", "voltz", "voxy", "will cypha", "will vi", "will vs", "windom", "wish",
    "yaris", "yaris cross"
  ],
  NISSAN: [
    "180sx", "ad max wagon", "ad wagon", "ariya", "aura", "avenir",
    "avenir salut", "bassara", "bluebird", "bluebird aussie", "bluebird sylphy",
    "bluebird wagon", "caravan coach", "caravan elgrand", "caravan wagon",
    "cedric", "cedric cima", "cedric wagon", "cefiro", "cefiro wagon", "cima",
    "clipper rio", "crew", "cube", "cube cubic", "datsun pick up", "dayz",
    "dayz roox", "dualis", "elgrand", "env200wagon", "exa", "fairlady z", "figaro",
    "fuga", "fuga hybrid", "gloria", "gloria cima", "gloria wagon", "gtr",
    "homy coach", "homy elgrand", "infiniti q45", "juke", "kicks", "kix",
    "lafesta", "largo", "latio", "laurel", "leaf", "leopard", "leopard jferrie",
    "liberty", "lucino", "lucino hatch", "lucino srv", "march", "march box",
    "maxima", "micra cc", "mistral", "moco", "murano", "note", "nv100clipper rio",
    "nv200vanette wagon", "nv350caravan wagon", "otti", "pao", "pino", "prairie",
    "prairie joy", "presage", "presea", "president", "president js", "primera",
    "primera camino", "primera camino wagon", "primera uk", "primera wagon",
    "pulsar", "pulsar serie", "pulsar serie srv", "quest", "rasheen", "rnessa",
    "roox", "safari", "sakura", "serena", "silvia", "skyline", "skyline crossover",
    "stagea", "sunny", "sunny california", "sunny nxcoupe", "sylphy", "teana",
    "terrano", "terrano regulus", "tiida", "tiida latio", "tino",
    "vanette largo coach", "vanette serena", "vw santana", "wingroad", "xtrail"
  ],
  HONDA: [
    "accord", "accord coupe", "accord hybrid", "accord inspire",
    "accord plugin hybrid", "accord tourer", "accord wagon", "airwave", "ascot",
    "ascot innova", "avancier", "beat", "capa", "city", "civic", "civic coupe",
    "civic ferio", "civic hybrid", "civic shuttle", "clarity fuel cell",
    "clarity phev", "concerto", "cross road", "crv", "crv hybrid", "crx",
    "crx delsol", "crz", "domani", "edix", "element", "elysion", "elysion prestige",
    "fit", "fit aria", "fit hybrid", "fit shuttle", "fit shuttle hybrid", "freed",
    "freed hybrid", "freed plus", "freed plus hybrid", "freed spike",
    "freed spike hybrid", "grace", "honda e", "horizon", "hrv", "insight",
    "insight exclusive", "inspire", "integra", "integra sj", "jade", "jazz",
    "lagreat", "legend", "legend coupe", "life", "life dunk", "logo", "mdx",
    "mobilio", "mobilio spike", "nbox", "nbox custom", "nbox plus", "nbox plus custom",
    "nbox slash", "none", "nsx", "nwgn", "nwgn custom", "odyssey", "odyssey hybrid",
    "odyssey prestige", "orthia", "orthia p", "orthia v", "prelude", "prelude inx",
    "rafaga", "s2000", "s660", "saber", "shuttle", "smx", "stepwagon",
    "stepwagon spada", "stream", "street", "thats", "today", "today associe",
    "torneo", "vamos", "vamos hobio", "vezel", "vigor", "z", "zest", "zest spark",
    "zrv"
  ],
  MAZDA: [
    "azoffroad", "azwagon", "axela", "biante", "bongo friendee", "bongo van",
    "bongo wagon", "capella", "capella cargo", "capella wagon", "carlos wagon",
    "carlot wagon", "cosmo", "demio", "efini ms8", "efini ms9", "familia",
    "familia s wagon", "familia van", "mpv", "premacy", "proceed marvie",
    "proceed levante", "proceed levante van", "proceed levante wagon", "proceed",
    "roadster", "rx7", "rx8", "scrum wagon", "sentia", "spiano", "tribute",
    "verisa"
  ],
  EUNOS: [
    "100", "300", "500", "800", "cosmo", "presso", "roadster"
  ],
  MITSUBISHI: [
    "airtrek", "chariot", "chariot grandis", "colt", "colt plus", "debonaire",
    "delica d2", "delica d3", "delica d5", "delica spacegear", "delica starwagon",
    "diamante", "diamante wagon", "dingo", "ek active", "ek classic", "ek cross",
    "ek custom", "ek space", "ek sport", "ek wagon", "fto", "galant", "galant fortis",
    "galant sigma", "grandis", "gto", "i", "i miev", "jeep", "lancer", "lancer cargo",
    "lancer cedia", "lancer cedia wagon", "lancer evolution", "lancer wagon",
    "legnum", "libero", "libero cargo", "minica", "minicab bravo", "minicab truck",
    "minicab van", "mirage", "mirage asti", "mirage dingo", "outlander",
    "outlander phev", "pajero", "pajero io", "pajero junior", "pajero mini",
    "pajero pinin", "pistachio", "rvr", "space runner", "space wagon", "toppo",
    "toppo bj", "toppo bj wide", "town box", "town box wide"
  ],
  SUBARU: [
    "360", "alcyone", "baja", "crosstrek", "dex", "dias wagon", "exiga", "forester",
    "impreza", "impreza g4", "impreza sport", "impreza xv", "justy", "legacy",
    "legacy b4", "legacy touring wagon", "levorg", "lucra", "outback", "pleo",
    "pleo nesta", "pleo plus", "pleasure wagon", "rex", "sambar truck",
    "sambar van", "stella", "trezia", "vivio", "vivio bistro", "wrx", "wrx s4",
    "wrx sti", "xt", "xv"
  ]
};
