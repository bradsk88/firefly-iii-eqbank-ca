import {
    AccountRoleProperty,
    AccountStore,
    ShortAccountTypeProperty
} from "firefly-iii-typescript-sdk-fetch/dist/models";
import {AutoRunState} from "../background/auto_state";
import {getAccountElements, getAccountName, getAccountNumber, getOpeningBalance} from "./scrape/accounts";
import {openAccountForAutoRun} from "./auto_run/accounts";
import {runOnContentChange, runOnURLMatch} from "../common/buttons";

async function scrapeAccountsFromPage(): Promise<AccountStore[]> {
    const accountElements = getAccountElements();
    if (accountElements?.length === 0) {
        throw new Error('Page is not ready for scrape. Will try again on next draw.');
    }
    autoRunStartedFor = AutoRunState.Accounts;
    const accounts = accountElements.map(element => {
        const accountNumber = getAccountNumber(element)
        const accountName = getAccountName(element);
        const openingBalance = getOpeningBalance(element);
        const as: AccountStore = {
            // iban: "12345", // Not all banks have an IBAN
            // bic: "123", // Not all banks have an BIC
            name: `${accountName} (EQ Bank)`,
            accountNumber: accountNumber,
            type: ShortAccountTypeProperty.Asset,
            accountRole: AccountRoleProperty.SavingAsset, // TODO: Infer this from the page headers
            currencyCode: "CAD",
            openingBalance: `${openingBalance?.balance}`,
            openingBalanceDate: openingBalance?.date,
        };
        return as;
    });
    chrome.runtime.sendMessage(
        {
            action: "store_accounts",
            value: accounts,
        },
        () => {
        }
    );
    return accounts;
}

const buttonId = 'firefly-iii-export-accounts-button';

function buildButton() {
    const button = document.createElement("button");
    button.id = buttonId;
    button.textContent = "Export accounts to Firefly III"
    button.addEventListener("click", () => scrapeAccountsFromPage(), false);

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
    return housing;
}

function addButton(): boolean {
    const button = buildButton();
    button.addEventListener("click", () => scrapeAccountsFromPage(), false);
    const target = document.querySelector('ul.actions');
    target?.append(button);
    return !!target;
}

function enableAutoRun() {
    // This code is for executing the auto-run functionality for the hub extension
    // More Info: https://github.com/bradsk88/firefly-iii-chrome-extension-hub
    chrome.runtime.sendMessage({
        action: "get_auto_run_state",
    }).then(state => {
        if (autoRunStartedFor === state) {
            return
        }
        if (state === AutoRunState.Accounts) {
            scrapeAccountsFromPage()
                .then(() => chrome.runtime.sendMessage({
                    action: "complete_auto_run_state",
                    state: AutoRunState.Accounts,
                }))
                .catch(err => console.log(err));
        } else if (state === AutoRunState.Transactions) {
            openAccountForAutoRun();
        }
    });
}

let autoRunStartedFor: AutoRunState;

runOnURLMatch(
    '/dashboard',
    () => !!document.getElementById(buttonId),
    () => {
        addButton();
    },
);

runOnContentChange(
    '/dashboard',
    enableAutoRun,
);
