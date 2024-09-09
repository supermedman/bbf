const { ActionRowBuilder, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { getTypeof } = require("../../../../uniHelperFunctions");

/**
 * NavMenu is the core display interaction handler, it manages;
 * menu navigation, paging, button/string component id extraction.
 * 
 * As well as containing "Listening methods":
 */
class NavMenu {
    /**
     * #### `cID` === `collectedComponentInteraction.customId` 
     * 
     * ### `NavMenu(...).whatDoYouHear(id)` Calls everything following:
     * 
     * ~~==~~ `NavMenu.pageWasHeard(cID)` ~~==~~ **CHECK FOR FIRST**
     * 
     * Returns true on `back-page` and `next-page` **EXCLUSIVELY**.
     * 
     * Call `NavMenu.handlePaging(cID)` to change internal page position
     * Call `NavMenu.loadNextPage()` to retrieve the page at the internally stored position
     * 
     * ~~==~~ `NavMenu.nextWasHeard(cID)` ~~==~~ **CHECK FOR SECOND**
     * 
     * Returns true on `ids` not found within `back` or `cancel`
     * 
     * Call `NavMenu.goingForward(displayObject)` within `anchor.edit()` to load the next menu
     * 
     * ~~==~~ `NavMenu.backWasHeard(cID)` ~~==~~ 
     * 
     * Returns true on `ids` starting with "back-"
     * 
     * Call `NavMenu.goingBack()` within `anchor.edit()` to load previous menu
     * 
     * ~~==~~ `NavMenu.cancelWasHeard(cID)` ~~==~~ 
     * 
     * Returns true on `ids` starting with "cancel-" || "cancel"
     * 
     * @template E
     * @param {object} user UserData DB Object
     * @param {{components: ActionRowBuilder[], embeds?: EmbedBuilder[], files?: AttachmentBuilder[]}} displayOne First Display Object
     * @param {string[] | [ActionRowBuilder]} firstRowIDS Array of Component.custom_id strings or ActionRowBuilder
     * @param {E} [extraSpecs] Any additional props to store, stored as `.specs`
     */
    constructor(user, displayOne, firstRowIDS=[], extraSpecs){
        this.userUsing = user.userid;

        this.navDisplayPath = [displayOne];

        this.listenForPages = ['back-page', 'next-page'];
        this.listenForNext = [];
        this.listenForBack = [];
        this.listenForCancel = [];
        
        if (getTypeof(firstRowIDS[0]) === 'ActionRowBuilder'){
            this.extractActionRowIDS(...firstRowIDS);
        } else this.listenForNext = [firstRowIDS];

        /**
         * @type {E} 
         */
        this.specs = extraSpecs;

        this.currentPagingPage = {};

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

    /**
     * This method checks each of the internal listening groups for the given id.
     * 
     * Returns a string representing the match that was made,
     * 
     * `PAGE` one of `this.listenForPages[]`
     * 
     * `NEXT` one of `this.listenForNext.at(-1)`
     * 
     * `BACK` one of `this.listenForBack.at(-1)`
     * 
     * `CANCEL` one of `this.listenForCancel.at(-1)`
     * 
     * `UNKNOWN` given id was matchless!
     * @param {string} id componentInteraction.custom_id
     * @returns {string}
     */
    whatDoYouHear(id){
        if (this.pageWasHeard(id)){
            return 'PAGE';
        } else if (this.nextWasHeard(id)){
            return 'NEXT';
        } else if (this.backWasHeard(id)){
            return 'BACK';
        } else if (this.cancelWasHeard(id)){
            return 'CANCEL';
        } else return 'UNKNOWN';
    }

    pageWasHeard(id){
        return this.listenForPages.includes(id);
    }

    nextWasHeard(id) {
        return this.listenForNext.at(-1).includes(id);
    }

    backWasHeard(id) {
        return this.listenForBack.at(-1).includes(id);
    }

    cancelWasHeard(id){
        return this.listenForCancel.at(-1).includes(id);
    }

    /**
     * This method loads the `this.paging` object, 
     * object with either `{embeds: EmbedBuilder[]}` or `{files: AttachmentBuilder[]}` is required.
     * Both being present is optional and allowed.
     * @param {{embeds: EmbedBuilder[] | undefined, files: AttachmentBuilder[] | undefined}} types One/Both of embeds/files
     * @param {object | undefined} pageExtras Object containing `curPage` indexed arrays
     */
    loadPagingMenu(types, pageExtras){
        this.loadPageDisplays(types);
        this.loadPageExtras(pageExtras);
    }

    /**
     * This method loads the internal storages based on the given storage object
     * @param {{embeds: EmbedBuilder[] | undefined, files: AttachmentBuilder[] | undefined}} types One/Both of embeds/files
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

    loadPageExtras(pageExtras){
        this.paging.storedExtras = pageExtras;
    }

    /**
     * This method clears the contents of the paging menu, setting all values to defaults
     */
    clearPagingMenu(){
        this.clearDisplayPages();
    }

    clearDisplayPages(){
        this.paging.displayUsing.embeds = false;
        this.paging.displayUsing.files = false;

        this.paging.displayStore.embeds = [];
        this.paging.displayStore.files = [];

        this.paging.curPage = 0;
        this.paging.lastPage = 0;

        this.clearPageExtras();
    }

    clearPageExtras(){
        this.paging.storedExtras = {};
    }

    handlePaging(id){
        // if (!this.pageWasHeard(id)) return false;

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
        
        this.currentPagingPage = nextDisplayObj;

        return nextDisplayObj;
    }

    loadCurrentPage(){
        return this.currentPagingPage;
    }

    /**
     * This function extracts the ``custom_id``'s from all ``ButtonBuilder`` & ``StringSelectMenuBuilder`` 
     * components within the given ``rows``. 
     * 
     * This function iterates through each ``ActionRowBuilder`` adding all ``StringSelect`` and all ``Buttons``
     * with IDS not starting with `back-` || `cancel-` to the given ``next[]``
     * 
     * Any and all ``Buttons`` with IDS starting with ``back-`` are added to the given ``back[]``
     * @param  {...ActionRowBuilder} rows Between 1 - 5 Active ActionRowBuilders
     */
    extractActionRowIDS(...rows) {
        // NOT reserved
        const isReserved = bid => this.listenForPages.includes(bid);

        // NOT reserved AND IS backButton
        const isBackButton = bid => {
            return !isReserved(bid) && bid.startsWith('back-');
        };
        // NOT reserved AND IS cancelButton
        const isCancelButton = bid => {
            return !isReserved(bid) && bid.startsWith('cancel');
        };
        // NOT reserved AND IS backButton OR cancelButton
        const isNegativeButton = bid => {
            return !!(isBackButton(bid) || isCancelButton(bid));
        };
        
        const isButtBuilder = (c) => getTypeof(c) === 'ButtonBuilder';
        const isStringBuilder = (c) => getTypeof(c) === 'StringSelectMenuBuilder';

        const nextList = [], backList = [], cancelList = [];
        for (const actionRow of rows){
            if (isStringBuilder(actionRow.components[0])){
                nextList.push(actionRow.components[0].data.custom_id);
                continue;
            }

            const curRowIDList = actionRow.components.filter(c => isButtBuilder(c)).map(bb => bb.data.custom_id);
            nextList.push(...curRowIDList.filter(bid => !isNegativeButton(bid) && !isReserved(bid)));
            backList.push(...curRowIDList.filter(bid => isBackButton(bid)));
            cancelList.push(...curRowIDList.filter(bid => isCancelButton(bid)));
        }

        this.listenForNext.push(nextList);
        this.listenForBack.push(backList);
        this.listenForCancel.push(cancelList);
    }

    /**
     * This method handles moving forward in the navigation tree using the given display object
     * @param {{components: ActionRowBuilder[], embeds?: EmbedBuilder[], files?: AttachmentBuilder[]}} displayObj Menu to display next
     * @returns {object}
     */
    goingForward(displayObj){
        if (!displayObj.components) return;
        if (!displayObj.files && !displayObj.embeds) return;

        this.extractActionRowIDS(displayObj.components);
        this.navDisplayPath.push(displayObj);

        return this.navDisplayPath.at(-1);
    }

    /**
     * This method returns the current menu page display
     * @returns {object}
     */
    goingNowhere(){
        return this.navDisplayPath.at(-1);
    }

    /**
     * USE IN FAVOUR OF `this.goingBack()`
     * @returns {object}
     */
    goingBackward(){
        if (this.navDisplayPath.length === 1) {
            // Catch handle for `delete-page` `cancel-<base-menu>`
            // If caught handle menu destroy
            return this.navDisplayPath[0];
        }

        this.navDisplayPath.pop();
        this.listenForBack.pop();
        this.listenForNext.pop();

        return this.navDisplayPath.at(-1);
    }

    /**
     * TO BE REMOVED
     * @returns {void}
     */
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


module.exports = { NavMenu };