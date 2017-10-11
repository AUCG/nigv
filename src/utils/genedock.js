import CryptoJS from 'crypto-js';

export default class GeneDock {
    addGeneDockHeaders(url, options, config) {
        const query = options.sendData || options.body;

        const method = options.method || (query ? "POST" : "GET");
        const headers = options.headers || {};

        headers["Cache-Control"] = "no-cache";

        const dateString = new Date().toUTCString();

        const contentMD5 = CryptoJS.MD5(query).toString(CryptoJS.enc.Base64);

        const resource = url.replace(config.base_address, '');
        
        const contentType = 'application/json; charset=UTF-8';

        const stringToSign = method+'\n'+ contentMD5+'\n'+
                        contentType +'\n'+dateString+'\n'+'x-gd-date:'+ 
                        dateString+'\n'+resource;

        const signature = CryptoJS.HmacSHA1(stringToSign, config.access_key_secret).toString(CryptoJS.enc.Base64);;

        const auth = `GeneDock ${config.access_key_id}:${signature}`;
        
        headers['authorization'] = auth;
        headers['x-gd-date'] = dateString;
        headers['content-md5'] = contentMD5;

        return headers;
    }
}