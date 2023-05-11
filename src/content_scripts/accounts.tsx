import {
    AccountRoleProperty,
    AccountStore,
    ShortAccountTypeProperty
} from "firefly-iii-typescript-sdk-fetch/dist/models";
import {AutoRunState} from "../background/auto_state";
import {
    getAccountElements,
    getAccountName,
    getAccountNumber,
    getButtonDestination,
    getOpeningBalance,
    isPageReadyForScraping,
    knownAccountsWithoutNumbers
} from "./scrape/accounts";
import {openAccountForAutoRun} from "./auto_run/accounts";
import {runOnURLMatch} from "../common/buttons";
import {runOnContentChange} from "../common/autorun";
import {debugLog} from "./auto_run/debug";
import {TransactionStore, TransactionTypeProperty} from "firefly-iii-typescript-sdk-fetch";
import {AccountRead} from "firefly-iii-typescript-sdk-fetch/dist/models/AccountRead";
import {priceFromString} from "../common/prices";

let pageAlreadyScraped = false;
export let navigating = false;

export function setNavigating(): void {
    navigating = true;
}

async function scrapeAccountsFromPage(isAutoRun: boolean): Promise<AccountStore[]> {
    if (isAutoRun && pageAlreadyScraped) {
        throw new Error("Already scraped. Stopping.");
    }

    const accountElements = getAccountElements();
    if (accountElements?.length === 0) {
        throw new Error("Accounts are not present yet.")
    }
    const accounts = accountElements.map(element => {
        const accountNumber = getAccountNumber(element)
        const accountName = getAccountName(element);
        const openingBalance = getOpeningBalance(element);
        let openingBalanceBalance: string | undefined;
        if (openingBalance) {
            openingBalanceBalance = `${openingBalance.balance}`;
        }
        const as: AccountStore = {
            name: accountName,
            accountNumber: accountNumber,
            openingBalance: openingBalanceBalance,
            openingBalanceDate: openingBalance?.date,
            type: ShortAccountTypeProperty.Asset,
            accountRole: AccountRoleProperty.DefaultAsset,
            currencyCode: "CAD",
        };
        return as;
    });
    pageAlreadyScraped = true;
    chrome.runtime.sendMessage(
        {
            action: "store_accounts",
            is_auto_run: isAutoRun,
            value: accounts,
        },
        () => {
        }
    );
    const listedAccts: AccountRead[] = await chrome.runtime.sendMessage({
        action: "list_accounts",
    });
    for (let a of accounts) {
        if (!Object.values(knownAccountsWithoutNumbers).includes(a.accountNumber!)) {
            continue;
        }
        const account = listedAccts.find(l => l.attributes.type === ShortAccountTypeProperty.Asset && l.attributes.accountNumber === a.accountNumber);
        if (!account) {
            continue;
        }

        const change = priceFromString(a.openingBalance || "0") - priceFromString(account!.attributes.currentBalance || "0");
        if (change === 0) {
            continue;
        }

        const tType = change >= 0 ? TransactionTypeProperty.Deposit : TransactionTypeProperty.Withdrawal;
        const sourceId = change < 0 ? account.id : undefined;
        const destId = change > 0 ? account.id : undefined;

        if ((!sourceId) && (!destId)) {
            throw new Error("Could not find index ")
        }

        const tx: TransactionStore[] = [{
            errorIfDuplicateHash: false,
            transactions: [{
                amount: `${change}`,
                date: new Date(),
                type: tType,
                description: 'Balance update',
                destinationId: destId,
                sourceId: sourceId
            }],
        }];
        chrome.runtime.sendMessage({
                action: "store_transactions",
                is_auto_run: isAutoRun,
                value: tx,
            },
            () => {
            })
    }
    return accounts;
}

const buttonId = 'firefly-iii-export-accounts-button';

function addButton() {
    const button = document.createElement("button");
    button.id = buttonId;
    button.textContent = "Export Accounts"
    button.addEventListener("click", () => scrapeAccountsFromPage(false), false);

    button.style.background = 'rgb(255, 205, 41)';
    button.style.border = 'none';
    button.style.padding = '8px';
    button.style.borderRadius = '4px';
    button.style.fontWeight = '600';
    button.style.width = '253px';

    const housing = document.createElement("div")
    housing.style.textAlign = "end";
    housing.style.width = "100%";
    // housing.style.marginBlock = "-37px";
    housing.append(button)

    getButtonDestination().append(housing);
}

function enableAutoRun() {
    // This code is for executing the auto-run functionality for the hub extension
    // More Info: https://github.com/bradsk88/firefly-iii-chrome-extension-hub
    debugLog('in enableAutoRun')
    if (!isPageReadyForScraping()) {
        debugLog("Page is not ready for account scraping")
        return;
    }

    chrome.runtime.sendMessage({
        action: "get_auto_run_state",
    }).then(state => {
        debugLog("Got state", state)
        if (state === AutoRunState.Accounts) {
            debugLog('scraping page for accounts');
            scrapeAccountsFromPage(true)
                .then(() => chrome.runtime.sendMessage({
                    action: "complete_auto_run_state",
                    state: AutoRunState.Accounts,
                }))
                .then(() => openAccountForAutoRun())
                .catch(() => {
                    console.log('Error from account scrape. Will try again on next redraw')
                });
        } else if (state === AutoRunState.Transactions) {
            openAccountForAutoRun();
        }
    });
}

const accountsUrl = 'dashboard';

runOnURLMatch(accountsUrl, () => {
    pageAlreadyScraped = false;
    navigating = false;
});

runOnContentChange(
    accountsUrl,
    () => {
        if (!!document.getElementById(buttonId)) {
            return;
        }
        addButton();
    },
    getButtonDestination,
)


runOnContentChange(
    accountsUrl,
    enableAutoRun,
    () => document.querySelector('app-root')!,
    'accounts',
)