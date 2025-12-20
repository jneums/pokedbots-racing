export declare const to32bits: (num: number) => number[];
export declare const from32bits: (ba: Uint8Array) => number;
export declare const generatetokenIdentifier: (principal: string, index: number) => string;
export declare const toHexString: (byteArray: Uint8Array) => string;
export declare const fromHexString: (hex: string) => number[];
export declare const decodeTokenId: (tid: string) => {
    index: number;
    canister: string;
    token: string;
};
export declare const generateExtAssetLink: (tokenId: string) => string;
export declare const generateExtThumbnailLink: (tokenId: string) => string;
export declare const getSubAccountArray: (s: number | number[]) => any[];
//# sourceMappingURL=ext.d.ts.map