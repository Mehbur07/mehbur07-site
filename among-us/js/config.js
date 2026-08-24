/* Canvas roundRect Polyfill for universal browser compatibility */
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
        if (!radii) radii = 0;
        if (typeof radii === 'number') radii = [radii, radii, radii, radii];
        if (Array.isArray(radii) && radii.length === 1) radii = [radii[0], radii[0], radii[0], radii[0]];
        const [tl, tr, br, bl] = radii;
        this.beginPath();
        this.moveTo(x + tl, y);
        this.lineTo(x + w - tr, y);
        this.quadraticCurveTo(x + w, y, x + w, y + tr);
        this.lineTo(x + w, y + h - br);
        this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
        this.lineTo(x + bl, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - bl);
        this.lineTo(x, y + tl);
        this.quadraticCurveTo(x, y, x + tl, y);
        this.closePath();
        return this;
    };
}


const CONFIG = {
    CANVAS_WIDTH: 1280,
    CANVAS_HEIGHT: 720,
    MAP_WIDTH: 3200,
    MAP_HEIGHT: 2400,

    PLAYER_RADIUS: 24,
    BASE_SPEED: 4.0,
    VISION_CREWMATE: 480,
    VISION_IMPOSTOR: 640,
    VISION_LIGHTS_OUT: 180,
    KILL_DISTANCE: 90,

    COLORS: [
        { id: 'red', name: 'Kırmızı', hex: '#c51111', shadow: '#7a0808' },
        { id: 'blue', name: 'Mavi', hex: '#132ed1', shadow: '#09158e' },
        { id: 'green', name: 'Yeşil', hex: '#117f2d', shadow: '#0a4d1a' },
        { id: 'pink', name: 'Pembe', hex: '#ed54ba', shadow: '#ab2d81' },
        { id: 'orange', name: 'Turuncu', hex: '#ef7d0d', shadow: '#b33e15' },
        { id: 'yellow', name: 'Sarı', hex: '#f5f557', shadow: '#c2870c' },
        { id: 'black', name: 'Siyah', hex: '#3f474e', shadow: '#1e1f26' },
        { id: 'white', name: 'Beyaz', hex: '#d6e0f0', shadow: '#8394bf' },
        { id: 'purple', name: 'Mor', hex: '#6b2fbb', shadow: '#3b177c' },
        { id: 'cyan', name: 'Siyan', hex: '#38fedc', shadow: '#24a8be' },
        { id: 'lime', name: 'Açık Yeşil', hex: '#50ef39', shadow: '#15a742' },
        { id: 'brown', name: 'Kahve', hex: '#71491e', shadow: '#40250b' }
    ],

    HATS: [
        { id: 'none', name: 'Yok', icon: '❌' },
        { id: 'tophat', name: 'Silindir Şapka', icon: '🎩' },
        { id: 'party', name: 'Parti Şapkası', icon: '🎉' },
        { id: 'crown', name: 'Kral Tacı', icon: '👑' },
        { id: 'viking', name: 'Viking Kaskı', icon: '🪖' },
        { id: 'devil', name: 'Şeytan Boynuzu', icon: '😈' },
        { id: 'flower', name: 'Çiçek', icon: '🌸' },
        { id: 'beanie', name: 'Kışlık Bere', icon: '🧢' },
        { id: 'astronaut', name: 'Astronot', icon: '🧑‍🚀' },
        { id: 'police', name: 'Polis Şapkası', icon: '👮' }
    ],

    ROOMS: [
        { id: 'cafeteria', name: 'Cafeteria', x: 1600, y: 550, w: 420, h: 320, color: '#2b3952' },
        { id: 'weapons', name: 'Weapons', x: 2350, y: 550, w: 320, h: 260, color: '#314457' },
        { id: 'o2', name: 'O2', x: 2150, y: 920, w: 220, h: 220, color: '#273b4e' },
        { id: 'navigation', name: 'Navigation', x: 2750, y: 1100, w: 260, h: 320, color: '#24344d' },
        { id: 'shields', name: 'Shields', x: 2350, y: 1650, w: 320, h: 260, color: '#28364f' },
        { id: 'comms', name: 'Communications', x: 1950, y: 1850, w: 260, h: 200, color: '#2b3345' },
        { id: 'storage', name: 'Storage', x: 1600, y: 1550, w: 380, h: 360, color: '#363442' },
        { id: 'admin', name: 'Admin', x: 2150, y: 1280, w: 280, h: 240, color: '#2b3b55' },
        { id: 'electrical', name: 'Electrical', x: 1180, y: 1250, w: 280, h: 260, color: '#3c3a2f' },
        { id: 'lower_engine', name: 'Lower Engine', x: 800, y: 1600, w: 280, h: 280, color: '#34384a' },
        { id: 'upper_engine', name: 'Upper Engine', x: 800, y: 650, w: 280, h: 280, color: '#34384a' },
        { id: 'reactor', name: 'Reactor', x: 420, y: 1120, w: 280, h: 380, color: '#442d38' },
        { id: 'security', name: 'Security', x: 1080, y: 920, w: 220, h: 200, color: '#243b3b' },
        { id: 'medbay', name: 'MedBay', x: 1200, y: 680, w: 240, h: 220, color: '#264047' }
    ],

    // Vents network
    VENTS: [
        { id: 'v_cafe', x: 1880, y: 460, room: 'cafeteria', connections: ['v_admin', 'v_nav_top'] },
        { id: 'v_admin', x: 2220, y: 1220, room: 'admin', connections: ['v_cafe', 'v_hallway_o2'] },
        { id: 'v_hallway_o2', x: 2120, y: 880, room: 'o2', connections: ['v_admin', 'v_cafe'] },
        { id: 'v_weapons', x: 2420, y: 480, room: 'weapons', connections: ['v_nav_top'] },
        { id: 'v_nav_top', x: 2780, y: 1040, room: 'navigation', connections: ['v_weapons', 'v_nav_bot', 'v_shields'] },
        { id: 'v_nav_bot', x: 2780, y: 1280, room: 'navigation', connections: ['v_nav_top', 'v_shields'] },
        { id: 'v_shields', x: 2420, y: 1720, room: 'shields', connections: ['v_nav_bot'] },
        { id: 'v_elec', x: 1120, y: 1200, room: 'electrical', connections: ['v_medbay', 'v_sec'] },
        { id: 'v_medbay', x: 1160, y: 640, room: 'medbay', connections: ['v_elec', 'v_sec'] },
        { id: 'v_sec', x: 1040, y: 880, room: 'security', connections: ['v_elec', 'v_medbay'] },
        { id: 'v_react_top', x: 400, y: 1000, room: 'reactor', connections: ['v_upper_eng'] },
        { id: 'v_upper_eng', x: 740, y: 600, room: 'upper_engine', connections: ['v_react_top'] },
        { id: 'v_react_bot', x: 400, y: 1260, room: 'reactor', connections: ['v_lower_eng'] },
        { id: 'v_lower_eng', x: 740, y: 1680, room: 'lower_engine', connections: ['v_react_bot'] }
    ],

    // Interactive Tasks on the map
    TASKS_DATA: [
        { id: 'wires_elec', type: 'wiring', name: 'Kabloları Bağla (Electrical)', room: 'electrical', x: 1280, y: 1180, duration: 'short' },
        { id: 'wires_admin', type: 'wiring', name: 'Kabloları Bağla (Admin)', room: 'admin', x: 2260, y: 1360, duration: 'short' },
        { id: 'wires_storage', type: 'wiring', name: 'Kabloları Bağla (Storage)', room: 'storage', x: 1700, y: 1700, duration: 'short' },
        { id: 'wires_nav', type: 'wiring', name: 'Kabloları Bağla (Navigation)', room: 'navigation', x: 2840, y: 1200, duration: 'short' },
        { id: 'swipe_card', type: 'swipe_card', name: 'Kimlik Kartı Okut (Admin)', room: 'admin', x: 2180, y: 1380, duration: 'short' },
        { id: 'asteroids', type: 'asteroids', name: 'Asteroitleri Vur (Weapons)', room: 'weapons', x: 2480, y: 520, duration: 'medium' },
        { id: 'medbay_scan', type: 'medbay_scan', name: 'Tıbbi Tarama (MedBay)', room: 'medbay', x: 1220, y: 720, duration: 'long' },
        { id: 'manifolds', type: 'manifolds', name: 'Manifoldları Aç (Reactor)', room: 'reactor', x: 340, y: 1100, duration: 'short' },
        { id: 'shields', type: 'shields', name: 'Kalkanları Güçlendir (Shields)', room: 'shields', x: 2420, y: 1760, duration: 'short' },
        { id: 'data_nav', type: 'upload_data', name: 'Veri İndir (Navigation)', room: 'navigation', x: 2780, y: 1140, duration: 'medium' },
        { id: 'data_admin', type: 'upload_data', name: 'Veri Yükle (Admin)', room: 'admin', x: 2220, y: 1280, duration: 'medium' },
        { id: 'align_engine_upper', type: 'align_engine', name: 'Motor Hizala (Upper Engine)', room: 'upper_engine', x: 740, y: 680, duration: 'short' },
        { id: 'align_engine_lower', type: 'align_engine', name: 'Motor Hizala (Lower Engine)', room: 'lower_engine', x: 740, y: 1600, duration: 'short' }
    ],

    // Interactive Ship Consoles (Emergency, Cams, Admin Radar)
    CONSOLES: [
        { id: 'emergency_button', type: 'emergency', name: 'Acil Durum Butonu', x: 1600, y: 530, radius: 45 },
        { id: 'admin_table', type: 'admin_table', name: 'Admin Masası', x: 2150, y: 1320, radius: 40 },
        { id: 'security_cams', type: 'security_cams', name: 'Güvenlik Kameraları', x: 1120, y: 920, radius: 40 }
    ],

    // Sabotage repair stations
    SABOTAGE_STATIONS: {
        reactor: [
            { id: 'reactor_1', name: 'Üst Reaktör Paneli', x: 340, y: 1040 },
            { id: 'reactor_2', name: 'Alt Reaktör Paneli', x: 340, y: 1200 }
        ],
        oxygen: [
            { id: 'o2_room', name: 'O2 Odası Paneli', x: 2200, y: 900 },
            { id: 'o2_admin', name: 'Admin Odası Paneli', x: 2280, y: 1320 }
        ],
        electrical: [
            { id: 'elec_switch', name: 'Elektrik Dağıtım Paneli', x: 1140, y: 1280 }
        ]
    }
};

window.CONFIG = CONFIG;
