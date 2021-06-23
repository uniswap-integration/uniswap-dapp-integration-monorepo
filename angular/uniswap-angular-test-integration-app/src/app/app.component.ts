import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import BigNumber from 'bignumber.js';
import { Subscription } from 'rxjs';
import { TradeDirection, Transaction } from 'simple-uniswap-sdk';
import {
  SelectTokenActionFrom,
  UniswapDappSharedLogic,
} from './uniswap-dapp-shared-logic';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  @Output()
  public generatedApproveTransaction: EventEmitter<Transaction> = new EventEmitter();

  public notEnoughLiquidity = false;

  public uniswapDappSharedLogic = new UniswapDappSharedLogic({
    inputCurrency: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // '0x419D0d8BdD9aF5e606Ae2232ed285Aff190E711b';
    outputCurrency: '0xDe30da39c46104798bB5aA3fe8B9e0e1F348163F', // 0xdac17f958d2ee523a2206206994597c13d831ec7
    supportedContracts: [
      { contractAddress: '0x419D0d8BdD9aF5e606Ae2232ed285Aff190E711b' },
      { contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7' },
      { contractAddress: '0x1985365e9f78359a9B6AD760e32412f4a445E862' },
      { contractAddress: '0x5EeAA2DCb23056F4E8654a349E57eBE5e76b5e6e' },
      { contractAddress: '0xDe30da39c46104798bB5aA3fe8B9e0e1F348163F' },
    ],
    // theming: {
    //   backgroundColor: 'red',
    //   button: { textColor: 'white', backgroundColor: 'blue' },
    //   panel: { textColor: 'black', backgroundColor: 'yellow' },
    //   textColor: 'orange',
    // },
  });

  public loading = true;

  public inputValue = '0.00004';
  public outputValue = '0';

  public transactionDeadline: number | undefined;
  public slippageCustom: number | undefined;

  private _newPriceTradeContextAvailableSubscription = Subscription.EMPTY;
  private _loadingUniswapSubscription = Subscription.EMPTY;

  constructor() {}

  /**
   * On destroy
   */
  public ngOnDestroy(): void {
    this._newPriceTradeContextAvailableSubscription.unsubscribe();
    this._loadingUniswapSubscription.unsubscribe();
  }

  /**
   * On load
   */
  public async ngOnInit(): Promise<void> {
    this._newPriceTradeContextAvailableSubscription =
      this.uniswapDappSharedLogic.newPriceTradeContextAvailable.subscribe(
        (tradeContext) => {
          if (tradeContext.quoteDirection === TradeDirection.input) {
            this.outputValue = tradeContext.expectedConvertQuote;
          } else {
            this.inputValue = tradeContext.expectedConvertQuote;
          }
        },
      );
    try {
      await this.uniswapDappSharedLogic.init();

      if (this.uniswapDappSharedLogic.tradeContext?.expectedConvertQuote) {
        this.outputValue =
          this.uniswapDappSharedLogic.tradeContext.expectedConvertQuote;
      }
    } catch (error) {
      this.notEnoughLiquidity = true;
    }

    this.loading = false;

    this._loadingUniswapSubscription =
      this.uniswapDappSharedLogic.loading.subscribe((_loading) => {
        this.loading = _loading;
      });
  }

  /**
   * Toggle settings
   */
  public toggleSettings(): void {
    this.uniswapDappSharedLogic.toggleSettings();
  }

  /**
   * Open token selector from
   */
  public openTokenSelectorFrom(): void {
    this.uniswapDappSharedLogic.openTokenSelectorFrom();
  }

  /**
   * Open token selector
   */
  public openTokenSelectorTo(): void {
    this.uniswapDappSharedLogic.openTokenSelectorTo();
  }

  /**
   * Hide token selector
   */
  public hideTokenSelector(): void {
    this.uniswapDappSharedLogic.hideTokenSelector();
  }

  /**
   * Change input trade price
   * @param amount The amount
   */
  public async changeInputTradePrice(amount: string): Promise<void> {
    this.notEnoughLiquidity = false;
    try {
      this.inputValue = amount;
      if (new BigNumber(this.inputValue).isEqualTo(0)) {
        this.outputValue = '0';
        return;
      }

      await this.uniswapDappSharedLogic.changeTradePrice(
        amount,
        TradeDirection.input,
      );
      this.outputValue =
        this.uniswapDappSharedLogic.tradeContext!.expectedConvertQuote;
    } catch (error) {
      this.notEnoughLiquidity = true;
    }
  }

  /**
   * Change output trade price
   * @param amount The amount
   */
  public async changeOutputTradePrice(amount: string): Promise<void> {
    this.notEnoughLiquidity = false;
    try {
      this.outputValue = amount;
      await this.uniswapDappSharedLogic.changeTradePrice(
        amount,
        TradeDirection.output,
      );
      this.inputValue =
        this.uniswapDappSharedLogic.tradeContext!.expectedConvertQuote;
    } catch (error) {
      this.notEnoughLiquidity = true;
    }
  }

  /**
   * Switch the swap
   */
  public async switchSwap(): Promise<void> {
    this.inputValue = this.outputValue;
    await this.uniswapDappSharedLogic.swapSwitch();

    this.outputValue =
      this.uniswapDappSharedLogic.tradeContext!.expectedConvertQuote;
  }

  /**
   * approve allowance data
   */
  public async approveAllowance(): Promise<void> {
    this.generatedApproveTransaction.emit(
      this.uniswapDappSharedLogic.tradeContext!.approvalTransaction!,
    );

    await this.uniswapDappSharedLogic.sendAsync(
      this.uniswapDappSharedLogic.tradeContext!.approvalTransaction!,
    );
  }

  /**
   * Confirm swap
   */
  public async confirmSwap(): Promise<void> {
    await this.uniswapDappSharedLogic.sendAsync(
      this.uniswapDappSharedLogic.tradeContext!.transaction,
    );
  }

  /**
   * Max supply
   */
  public async maxSwap(): Promise<void> {
    this.inputValue = await this.uniswapDappSharedLogic.setMaxInput();
    this.outputValue =
      this.uniswapDappSharedLogic.tradeContext!.expectedConvertQuote;
  }

  /**
   * Change select token
   * @param contractAddress The contractAddress
   */
  public async changeSelectToken(contractAddress: string): Promise<void> {
    switch (this.uniswapDappSharedLogic.selectorOpenFrom) {
      case SelectTokenActionFrom.input:
        if (
          this.uniswapDappSharedLogic.tradeContext?.toToken.contractAddress ===
          contractAddress
        ) {
          await this.switchSwap();
          this.hideTokenSelector();
          return;
        }
        await this.uniswapDappSharedLogic.changeToken(contractAddress);
        return;
      case SelectTokenActionFrom.output:
        if (
          this.uniswapDappSharedLogic.tradeContext?.fromToken
            .contractAddress === contractAddress
        ) {
          await this.switchSwap();
          this.hideTokenSelector();
          return;
        }
        await this.uniswapDappSharedLogic.changeToken(contractAddress);
    }
  }
}
