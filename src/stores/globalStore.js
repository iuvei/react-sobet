import {
    observable,
    action,
    runInAction
} from 'mobx';

class globalStore {

    @observable username = '张三的歌';

    @observable balance = '10000';

    @action refreshBalance = () => {
        this.balance = 'loading' ;
        setTimeout(() => {
            runInAction(() => {
                this.balance = '2000';
            });
        }, 2000);
    }

    @action getUserInfo = () => {

    }
}

export default new globalStore();