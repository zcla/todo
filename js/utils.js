"use strict";

class DateUtils {
    static formatYYYYMMDDHHNNSS(date) {
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().replace('T', '-').replaceAll(':', '-').split('.')[0];
    }
}

class EmojiUtils {
    // Nome: https://emojipedia.org/
    // HTML: https://www.w3schools.com/charsets/ref_emoji.asp
    static grimacing_face = '&#x1F62C;';
}

class StringUtils {
    static downloadString(str, fileName) {
        const downloader = document.createElement('a');
        downloader.style.display = 'none';
        downloader.href = 'data:attachment/text,' + encodeURIComponent(str);
        downloader.target = '_blank';
        downloader.download = fileName;
        downloader.click();
    }
}

class UrlUtils {
    static getUrlParams(locationSearch) {
        if (!locationSearch) {
            locationSearch = location.search;
        }
        const result = {};
        const paramArray = locationSearch.replace('?', '').split('&');
        for (const param of paramArray) {
            if (param) {
                let [key, value] = param.split('=');
                key = decodeURIComponent(key);
                value = decodeURIComponent(value);
                result[key] = decodeURIComponent(value);
            }
        }
        return result;
    }

    static gotoUrl(url) {
        window.location.href = url;
    }
}
