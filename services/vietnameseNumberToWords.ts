const CHU_SO = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const HANG_DON_VI = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

function docSo3ChuSo(baso: string): string {
    let tram, chuc, donvi;
    let ketqua = '';
    tram = parseInt(baso[0], 10);
    chuc = parseInt(baso[1], 10);
    donvi = parseInt(baso[2], 10);
    
    if (tram === 0 && chuc === 0 && donvi === 0) return '';
    
    if (tram !== 0) {
        ketqua += CHU_SO[tram] + ' trăm';
        if ((chuc === 0) && (donvi !== 0)) ketqua += ' linh';
    }
    
    if ((chuc !== 0) && (chuc !== 1)) {
        ketqua += ' ' + CHU_SO[chuc] + ' mươi';
        if ((chuc === 0) && (donvi !== 0)) ketqua += ' linh';
    }
    
    if (chuc === 1) ketqua += ' mười';
    
    switch (donvi) {
        case 1:
            if ((chuc !== 0) && (chuc !== 1)) {
                ketqua += ' mốt';
            } else {
                ketqua += ' ' + CHU_SO[donvi];
            }
            break;
        case 5:
            if (chuc === 0) {
                ketqua += ' ' + CHU_SO[donvi];
            } else {
                ketqua += ' lăm';
            }
            break;
        default:
            if (donvi !== 0) {
                ketqua += ' ' + CHU_SO[donvi];
            }
            break;
    }
    return ketqua;
}

export function toVietnameseWords(so: number): string {
    if (so === null || so === undefined) return '';
    if (so === 0) return 'Không đồng';
    
    let str = Math.floor(so).toString();
    let i = str.length;
    let ketqua = '';
    let M = 0;
    
    while(i > 0) {
        let chunk = str.substring(Math.max(0, i-3), i);
        i -= 3;
        
        if (chunk !== '000') {
            let doc = docSo3ChuSo(chunk.padStart(3, '0'));
            if (doc) {
                 ketqua = doc + ' ' + (HANG_DON_VI[M] || '') + ' ' + ketqua;
            }
        }
        M++;
    }
    
    ketqua = ketqua.replace(/\s+/g, ' ').trim();
    ketqua = ketqua.charAt(0).toUpperCase() + ketqua.slice(1);
    
    return ketqua + ' đồng';
}
