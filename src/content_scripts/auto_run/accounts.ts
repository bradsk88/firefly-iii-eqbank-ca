import {AutoRunState} from "../../background/auto_state";
import {
    getAccountElements,
    getAccountName,
    getAccountNumber,
    getOpeningBalance, knownAccountsWithoutNumbers,
    shouldSkipScrape
} from "../scrape/accounts";
import {debugAutoRun, isSingleAccountBank} from "../../extensionid";
import {debugHighlight, showDebug} from "./debug";
import {navigating, setNavigating} from "../accounts";
import {AccountRead} from "firefly-iii-typescript-sdk-fetch/dist/models/AccountRead";
import {TransactionStore, TransactionTypeProperty} from "firefly-iii-typescript-sdk-fetch";
import {OpeningBalance} from "../../background/firefly_export";
import {priceFromString} from "../../common/prices";

function findNextAccountElement(accountName: string): Element | undefined {
    // You probably shouldn't need to modify the function.
    // It scans the account "elements" on the page and returns the one that is
    // AFTER the last account whose transactions were scraped.
    let foundScraped = false;
    for (const button of getAccountElements()) {
        if (shouldSkipScrape(button)) {
            continue;
        }
        if (!accountName) {
            return button;
        }
        if (foundScraped) {
            return button;
        }
        if (getAccountName(button) === accountName) {
            foundScraped = true;
        }
    }
}

function navigateToAccount(
    accountElement: Element,
): void {
    if (debugAutoRun) {
        showDebug("Auto-run would click on the highlighted element. But debug mode is on." +
            "<br>Click it yourself to continue the auto-run procedure.");
        debugHighlight((accountElement as HTMLElement));
    } else {
        (accountElement as HTMLElement)?.click()
        setNavigating();
    }
}

async function scrapeSpecialAccount(accountElement: Element, autoRun: boolean) {
    const accounts: AccountRead[] = await chrome.runtime.sendMessage({
        action: "list_accounts",
    });
    const num = getAccountNumber(accountElement);
    const account = accounts.find(a => a.attributes.accountNumber = num);
    const curAmount: OpeningBalance = getOpeningBalance(accountElement)!;
    const change = curAmount.balance - priceFromString(account!.attributes.currentBalance!);
    const tType = change >= 0 ? TransactionTypeProperty.Deposit : TransactionTypeProperty.Withdrawal;
    const tx: TransactionStore[] = [{
        errorIfDuplicateHash: false,
        transactions: [{
            amount: `${change}`,
            date: new Date(),
            type: tType,
            description: 'Balance update',
        }],
    }];

}

export function openAccountForAutoRun() {
    if (navigating) {
        return;
    }
    // Be careful changing this function. The auto run orchestration is fragile.
    chrome.runtime.sendMessage({action: "get_auto_run_tx_last_account"})
        .then(account => findNextAccountElement(account))
        .then(accountElement => {
            if (accountElement) {
                navigateToAccount(accountElement);
                return;
            }
            if (isSingleAccountBank || !accountElement) {
                chrome.runtime.sendMessage({
                    action: "complete_auto_run_state",
                    state: AutoRunState.Transactions,
                });
            }
        });
}