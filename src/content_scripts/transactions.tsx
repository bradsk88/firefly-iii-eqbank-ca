import {TransactionStore} from "firefly-iii-typescript-sdk-fetch";
import {runOnURLMatch} from "../common/buttons";
import {AutoRunState} from "../background/auto_state";
import {getCurrentPageAccount, scrapeTransactionsFromPage} from "./scrape/transactions";
import {PageAccount} from "../common/accounts";
import {scrapeOpeningBalanceFromPage} from "./opening";
import {backToAccountsForAutoRun} from "./auto_run/transactions";

interface TransactionScrape {
    pageAccount: PageAccount;
    pageTransactions: TransactionStore[];
}

async function doScrape(): Promise<TransactionScrape> {
    const accounts = await chrome.runtime.sendMessage({
        action: "list_accounts",
    });
    const id = await getCurrentPageAccount(accounts);
    const txs = await scrapeTransactionsFromPage(id.id);
    chrome.runtime.sendMessage({
            action: "store_transactions",
            value: txs,
        },
        () => {
        });
    const openingBalance = scrapeOpeningBalanceFromPage(id)
    chrome.runtime.sendMessage(
        {
            action: "store_opening",
            value: openingBalance,
        },
        () => {
        }
    )
    return {
        pageAccount: id,
        pageTransactions: txs,
    };
}

const buttonId = 'firefly-iii-export-transactions-button';

function addButton() {
    const target = document.querySelector('app-more-options-menu');
    if (!target) {
        return;
    }

    const button = document.createElement("button");
    button.textContent = "Export to Firefly III"
    button.addEventListener("click", async () => doScrape(), false);

    button.classList.add('more-menu__main-btn', 'custom-button', 'secondary');
    target.prepend(button)
}

function enableAutoRun() {
    chrome.runtime.sendMessage({
        action: "get_auto_run_state",
    }).then(state => {
        if (state === AutoRunState.Transactions) {
            doScrape()
                .then((id: TransactionScrape) => chrome.runtime.sendMessage({
                    action: "increment_auto_run_tx_account",
                    lastAccountNameCompleted: id.pageAccount.name,
                }, () => {
                }))
                .then(() => backToAccountsForAutoRun());
        }
    });
}

// If your manifest.json allows your content script to run on multiple pages,
// you can call this function more than once, or set the urlPath to "".
runOnURLMatch(
    'accounts/main/details',
    () => !!document.getElementById(buttonId),
    () => {
        addButton();
        enableAutoRun();
    },
)
