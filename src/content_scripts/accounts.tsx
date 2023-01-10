import {
    AccountRoleProperty,
    AccountStore,
    ShortAccountTypeProperty
} from "firefly-iii-typescript-sdk-fetch/dist/models";
import {AutoRunState} from "../background/auto_state";
import {getAccountElements, getAccountName, getAccountNumber} from "./scrape/accounts";
import {openAccountForAutoRun} from "./auto_run/accounts";
import {runOnURLMatch} from "../common/buttons";

// TODO: You will need to update manifest.json so this file will be loaded on
//  the correct URL.

async function scrapeAccountsFromPage(): Promise<AccountStore[]> {
    return getAccountElements().map(element => {
        const accountNumber = getAccountNumber(element)
        const accountName = getAccountName(element);
        // TODO: Double-check these values. You may need to update them based
        //  on the account element or bank.
        const as: AccountStore = {
            // iban: "12345", // Not all banks have an IBAN
            // bic: "123", // Not all banks have an BIC
            name: accountName,
            accountNumber: accountNumber,
            type: ShortAccountTypeProperty.Asset,
            accountRole: AccountRoleProperty.DefaultAsset,
            currencyCode: "CAD",
        };
        return as;
    });
}

const buttonId = 'firefly-iii-export-accounts-button';

function addButton() {
    const button = document.createElement("button");
    button.id = buttonId;
    button.textContent = "Export Accounts"
    button.addEventListener("click", () => {
        const accounts = scrapeAccountsFromPage();
        chrome.runtime.sendMessage(
            {
                action: "store_accounts",
                value: accounts,
            },
            () => {
            }
        );
    }, false);
    document.body.append(button);
}

function enableAutoRun() {
    // This code is for executing the auto-run functionality for the hub extension
    // More Info: https://github.com/bradsk88/firefly-iii-chrome-extension-hub
    chrome.runtime.sendMessage({
        action: "get_auto_run_state",
    }).then(state => {
        if (state === AutoRunState.Accounts) {
            scrapeAccountsFromPage()
                .then(() => chrome.runtime.sendMessage({
                    action: "complete_auto_run_state",
                    state: AutoRunState.Accounts,
                }));
        } else if (state === AutoRunState.Transactions) {
            openAccountForAutoRun();
        }
    });
}

runOnURLMatch(
    'accounts/main/details', // TODO: Set this to your accounts page URL
    () => !!document.getElementById(buttonId),
    () => {
        addButton();
        enableAutoRun();
    });
