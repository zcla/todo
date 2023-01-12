"use strict";

// Junta vários when/then num só.
class Awaiter {
    // O callback será chamado após todas as Promises serem resolvidas.
    constructor(callback) {
        this.#whens = [];
        this.#thens = [];
        this.#callback = callback;
    }

    #whens = null;
    #thens = null;
    #callback = null;

    // Adiciona um promise (when) e seu callback (then)
    add(when, then) {
        this.#whens.push(when);
        this.#thens.push(then);
    }

    // Espera todas as promises, chamando o callback de cada uma. Ao final chama o callback passado no construtor.
    await() {
        $.when(...this.#whens).then((...datas) => {
            for (let i = 0; i < datas.length; i++) {
                this.#thens[i](datas[i]);
            }
            this.#callback();
        });
    }
}

class DateUtils {
    static formatYYYYMMDDHHNNSS(date) {
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().replace('T', '-').replaceAll(':', '-').split('.')[0];
    }
}

class EmojiUtils {
    // Nome: https://emojipedia.org/
    static broom = '&#x1F9F9;';
    static grimacing_face = '&#x1F62C;';
    static pencil = '&#x270F;';
    static plus = '&#x2795;';
    static wastebasket = '&#x1F5D1;';
    static writing_hand = '&#x270D;';
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
