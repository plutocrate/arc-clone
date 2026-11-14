const fs = require('fs');

function testFlightParse(name, buffer) {
    let _rowState = 0, _rowID = 0, _rowTag = 0, _rowLength = 0;
    const chunks = new Map();
    let s = 0;
    const len = buffer.length;
    let rowCount = 0;

    while (s < len) {
        let v = -1;
        switch (_rowState) {
            case 0:
                v = buffer[s++];
                if (v === 58) { // ':'
                    _rowState = 1;
                } else {
                    _rowID = (_rowID << 4) | (v > 96 ? v - 87 : v - 48);
                }
                continue;
            case 1:
                let d = buffer[s];
                if (d === 84 || d === 65 || d === 79 || d === 111 || d === 98 || d === 85 || d === 83 || d === 115 || d === 76 || d === 108 || d === 71 || d === 103 || d === 77 || d === 109 || d === 86) {
                    _rowTag = d; _rowState = 2; s++;
                } else if ((d > 64 && d < 91) || d === 35 || d === 114 || d === 120) {
                    _rowTag = d; _rowState = 3; s++;
                } else {
                    _rowTag = 0; _rowState = 3;
                }
                continue;
            case 2:
                v = buffer[s++];
                if (v === 44) { // ','
                    _rowState = 4;
                } else {
                    _rowLength = (_rowLength << 4) | (v > 96 ? v - 87 : v - 48);
                }
                continue;
            case 3:
                v = buffer.indexOf(10, s); // 10 is '\n'
                break;
            case 4:
                v = s + _rowLength;
                if (v > len) v = -1;
        }

        if (v > -1) {
            rowCount++;
            const rowBytes = buffer.subarray(s, v);
            const rowStr = rowBytes.toString('utf8');

            switch (_rowTag) {
                case 72: // 'H' -> Preload hint (e.g. :HL[...]). Does not add to chunks.
                    break;
                case 88: // 'X' -> AsyncIterable
                case 120: // 'x'
                    chunks.set(_rowID, { status: 'fulfilled', isIterable: true });
                    break;
                case 67: // 'C' -> close iterable
                    break;
                case 69: // 'E' -> Error
                    chunks.set(_rowID, { status: 'rejected', isIterable: false });
                    break;
                default: // Model chunk (tag 0 or 'I', etc.)
                    const existing = chunks.get(_rowID);
                    if (existing) {
                        if (existing.status !== 'pending' && !existing.isIterable) {
                            throw new Error(`CRASH on row ${rowCount} (ID 0x${_rowID.toString(16)}: ${rowStr.slice(0, 30)}): t.reason.enqueueModel is not a function (chunk status is ${existing.status})!`);
                        }
                    } else {
                        chunks.set(_rowID, { status: 'resolved_model', isIterable: false });
                    }
                    break;
            }

            s = v;
            if (_rowState === 3) s++; // skip '\n'
            _rowState = _rowID = _rowTag = _rowLength = 0;
        } else {
            break;
        }
    }
    console.log(`[PASS] ${name}: ${rowCount} rows, ${chunks.size} chunks.`);
}

module.exports = { testFlightParse };
