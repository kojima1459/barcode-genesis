"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeededRandom = void 0;
class SeededRandom {
    constructor(seed) {
        this.seed = this.hashString(seed);
    }
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i += 1) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
    next() {
        this.seed ^= this.seed << 13;
        this.seed ^= this.seed >> 17;
        this.seed ^= this.seed << 5;
        return (this.seed >>> 0) / 4294967296;
    }
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
    nextBool(probability = 0.5) {
        return this.next() < probability;
    }
}
exports.SeededRandom = SeededRandom;
//# sourceMappingURL=seededRandom.js.map