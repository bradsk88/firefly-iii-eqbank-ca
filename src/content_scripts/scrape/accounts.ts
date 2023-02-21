import {sha512} from "js-sha512";
import {OpeningBalance} from "../../background/firefly_export";
import {priceFromString} from "../../common/prices";

export function getButtonDestination(): Element {
    return document.querySelector('ul.actions')!;
}

function expandAll(): void {
    document.querySelectorAll('button.accordion-item[aria-expanded=false]').forEach(
        e => (e as HTMLButtonElement).click()
    )
}


const knownAccountsWithoutNumbers: {[key: string]: string} = {
    'TFSA GICs': 'tfsa_all_gics',
    'TFSA Savings Account': 'tfsa_savings',
}

export function isPageReadyForScraping(): boolean {
    return !!document.querySelector('span.account__details-number');
}

export function isPageReadyForScraping(): boolean {
    // TODO: Some banks load accounts in slowly. Find a DOM element that is
    //  only present on the page once the accounts are fully loaded.
    return !!document.querySelector('span.account__details-number');
}

export function getAccountElements(): Element[] {
    expandAll();
    return Array.from(document.querySelectorAll('li.account.accordion-item').values());
}

function getInfoSection(accountElement: Element) {
    return accountElement.querySelector('.account__details');
}

export function shouldSkipScrape(accountElement: Element): boolean {
    return Object.values(knownAccountsWithoutNumbers).includes(getAccountNumber(accountElement));
}

export function shouldSkipScrape(accountElement: Element): boolean {
    // TODO: If there are some types of accounts on the page that can't be
    //  scraped, return true for those here and they will be skipped.
    return false;
}

export function getAccountNumber(
    accountElement: Element,
): string {
    const infoSection = getInfoSection(accountElement);
    const accountNumber = infoSection!.id?.replace('-account', '')?.trim();
    if (!accountNumber) {
        return knownAccountsWithoutNumbers[getAccountName(accountElement)];
    }
    return accountNumber;
}

export function getAccountName(
    accountElement: Element,
): string {
    const infoSection = getInfoSection(accountElement);
    let nameSection = infoSection!.querySelector('span.account__details-name');
    let accountName = nameSection?.textContent?.trim();
    if  (!accountName) {
        accountName = infoSection!.textContent!;
    }
    return accountName.trim();
}

export function getOpeningBalance(
    accountElement: Element,
): OpeningBalance | undefined {
    const accountNumber = getAccountNumber(accountElement);
    if (accountNumber !== 'tfsa_all_gics') {
        return undefined;
    }
    const txt = accountElement.querySelector('dl.ml-auto dd')!.textContent!.trim()
    return {
        accountName: getAccountName(accountElement),
        accountNumber: accountNumber,
        balance: priceFromString(txt),
        date: new Date(),
    }
}