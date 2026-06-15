import { GameData } from './save-system';

// Simple primitive encryption/obfuscation for local storage
const SECRET_KEY = "SQUAD_OP";

function xorEncryptDecrypt(input: string, key: string): string {
    let result = '';
    for (let i = 0; i < input.length; i++) {
        result += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
}

export function encodeData(data: string): string {
    try {
        const xored = xorEncryptDecrypt(data, SECRET_KEY);
        // Base64 encode to make it safe for localStorage and look "encrypted"
        return btoa(unescape(encodeURIComponent(xored)));
    } catch {
        return btoa(data); // Fallback
    }
}

export function decodeData(encoded: string): string {
    try {
        const decodedBase64 = decodeURIComponent(escape(atob(encoded)));
        return xorEncryptDecrypt(decodedBase64, SECRET_KEY);
    } catch {
        // Fallback for non-encrypted or differently encoded data
        try {
            return atob(encoded);
        } catch {
            return encoded;
        }
    }
}
