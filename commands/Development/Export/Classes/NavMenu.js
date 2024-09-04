const { ActionRowBuilder } = require("discord.js");
const { getTypeof } = require("../../../../uniHelperFunctions");

class NavMenu {
    constructor(user, displayOne, firstRowIDS, extraSpecs){
        this.userUsing = user.userid;

        this.navDisplayPath = [displayOne];
        this.listenForPages = ['back-page', 'next-page'];
        this.pageDisplayNext = {};
        this.listenForBack = [];
        this.listenForNext = [firstRowIDS];

        this.specs = extraSpecs;

        this.paging = {
            curPage: 0,
            lastPage: 0,
            displayUsing: {
                embeds: false,
                files: false
            },
            displayStore: {
                embeds: [],
                files: []
            },
            storedExtras: {

            }
        };
    }

    backWasHeard(id) {
        return this.listenForBack.at(-1).includes(id);
    }

    nextWasHeard(id) {
        return this.listenForNext.at(-1).includes(id);
    }

    pageWasHeard(id){
        return this.listenForPages.includes(id);
    }

    /**
     * This method loads the internal storages based on the given storage object
     * @param {object} types {embeds?: [], files?: []}
     */
    loadPageDisplays(types){
        const givenType = key => !!types[key];
        Object.keys(this.paging.displayStore)
        .filter(key => givenType(key))
        .reduce((acc, key) => {
            acc = types[key];
            this.paging.displayUsing[key] = true;
            this.paging.displayStore[key] = acc;
            this.paging.lastPage = acc.length - 1;
            return;
        }, []);        
    }

    clearDisplayPages(){
        this.paging.displayUsing.embeds = false;
        this.paging.displayUsing.files = false;

        this.paging.displayStore.embeds = [];
        this.paging.displayStore.files = [];

        this.paging.curPage = 0;
        this.paging.lastPage = 0;
    }

    handlePaging(id){
        if (!this.pageWasHeard(id)) return false;

        switch(id){
            case "next-page":
                this.paging.curPage = (this.paging.curPage === this.paging.lastPage) ? 0 : this.paging.curPage + 1;
            break;
            case "back-page":
                this.paging.curPage = (this.paging.curPage === 0) ? this.paging.lastPage : this.paging.curPage - 1;
            break;
        }
    }

    loadNextPage(){
        const usingType = (key) => this.paging.displayUsing[key];
        const curPage = this.paging.curPage;
        const nextDisplayObj = Object.keys(this.paging.displayStore)
        .filter(key => usingType(key))
        .reduce((acc, key) => {
            acc[key] = [this.paging.displayStore[key][curPage]];
            return acc;
        }, {});
        
        this.pageDisplayNext = nextDisplayObj;
        
        return this.pageDisplayNext;
    }

    /**
     * This function extracts the ``custom_id``'s from all ``ButtonBuilder`` & ``StringSelectMenuBuilder`` 
     * components within the given ``rows``. 
     * 
     * This function iterates through each ``ActionRowBuilder`` adding all ``StringSelect`` and all ``Buttons``
     * with IDS not starting with ``back-`` to the given ``next[]``
     * 
     * Any and all ``Buttons`` with IDS starting with ``back-`` are added to the given ``back[]``
     * @param  {...ActionRowBuilder} rows Between 1 - 5 Active ActionRowBuilders
     */
    extractActionRowIDS(...rows) {
        const isBackButton = (bid) => bid.startsWith('back-');
        const isButtBuilder = (c) => getTypeof(c) === 'ButtonBuilder';
        const isStringBuilder = (c) => getTypeof(c) === 'StringSelectMenuBuilder';

        const nextList = [], backList = [];
        for (const actionRow of rows){
            if (isStringBuilder(actionRow.components[0])){
                nextList.push(actionRow.components[0].data.custom_id);
                continue;
            }

            const curRowIDList = actionRow.components.filter(c => isButtBuilder(c)).map(bb => bb.data.custom_id);
            nextList.push(...curRowIDList.filter(bid => !isBackButton(bid)));
            backList.push(...curRowIDList.filter(bid => isBackButton(bid)));
        }

        this.listenForNext.push(nextList);
        this.listenForBack.push(backList);
    }

    goingBack() {
        if (this.navDisplayPath.length === 1) return;

        this.navDisplayPath.pop();
        this.listenForBack.pop();
        this.listenForNext.pop();
    }

    destroy(){
        delete this;
    }
}


module.exports = {NavMenu};