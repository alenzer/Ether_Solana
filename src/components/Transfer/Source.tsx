import {
  CHAIN_ID_ETH,
  CHAIN_ID_SOLANA,
  CHAIN_ID_BSC,
  CHAIN_ID_ETHEREUM_ROPSTEN,
  NFTImplementation,
  TokenImplementation,
  WSOL_ADDRESS
} from "@certusone/wormhole-sdk";
import { getAddress } from "@ethersproject/address";
import { Button, makeStyles, Typography } from "@material-ui/core";
import { VerifiedUser } from "@material-ui/icons";
import { useCallback, useMemo, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router";
import { Link } from "react-router-dom";
import useIsWalletReady from "../../hooks/useIsWalletReady";
import useMarketsMap from "../../hooks/useMarketsMap";
import { useHandleRedeem } from "../../hooks/useHandleRedeem";
import useGetIsTransferCompleted from "../../hooks/useGetIsTransferCompleted";
import useTransactionFees from "../../hooks/useTransactionFees";
import { useEthereumProvider } from "../../contexts/EthereumProviderContext";
import Target from "./Target"
import Send from "./Send"
import {
  selectTransferAmount,  
  selectTransferShouldLockFields,
  selectTransferSourceBalanceString,
  selectTransferSourceChain,  
  selectTransferIsSendComplete,
  selectTransferSourceParsedTokenAccount,
  selectTransferTargetChain,
  selectTransferTargetAsset,  
  selectTransferActiveStep,
  selectTransferIsSending
} from "../../store/selectors";
import {
  setSourceParsedTokenAccount as setNFTSourceParsedTokenAccount,
  setSourceWalletAddress as setNFTSourceWalletAddress,
} from "../../store/nftSlice";
import {
  incrementStep,
  setAmount,
  setSourceChain,
  setTargetChain,
  setSourceParsedTokenAccount as setTransferSourceParsedTokenAccount,
  setSourceWalletAddress as setTransferSourceWalletAddress,
} from "../../store/transferSlice";
import {
  BSC_MIGRATION_ASSET_MAP,
  ROPSTEN_WETH_ADDRESS,  
  WETH_ADDRESS,  
  ETH_MIGRATION_ASSET_MAP,
  MIGRATION_ASSET_MAP,
  CLUSTER,
  CHAINS,
  MULTI_CHAIN_TOKENS,
  SOLANA_HOST
} from "../../utils/consts";
import SolanaSelect from "../SolanaSelect";
import EthereumSelect from "../EthereumSelect";
import ChainSelectArrow from "../ChainSelectArrow";
import KeyAndBalance from "../KeyAndBalance";
import LowBalanceWarning from "../LowBalanceWarning";
import NumberTextField from "../NumberTextField";
import StepDescription from "../StepDescription";
import SourceAssetWarning from "./SourceAssetWarning";
import {
  selectNFTSourceChain
} from "../../store/selectors";
import useGetSourceParsedTokens from "../../hooks/useGetSourceParsedTokenAccounts";
import { NFTParsedTokenAccount } from "../../store/nftSlice";
import {
  ethNFTToNFTParsedTokenAccount,
  ethTokenToParsedTokenAccount,
  getEthereumNFT,
  getEthereumToken
} from "../../utils/ethereum";

import { Provider, BN } from '@project-serum/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { TokenListProvider } from '@solana/spl-token-registry';  
import { Swap } from '@project-serum/swap';
import { useSolanaWallet } from "../../contexts/SolanaWalletContext";

//-------------------------------------------
import {
  // PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  Signer,
} from "@solana/web3.js";

import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
// import { BN, Provider } from "@project-serum/anchor";
import {
  // makeStyles,
  Card,
  // Button,
  // Typography,
  TextField,
  useTheme,
} from "@material-ui/core";
import { ExpandMore, ImportExportRounded } from "@material-ui/icons";
import { useSwapContext, useSwapFair } from "../context/Swap";
import {
  useDexContext,
  useOpenOrders,
  useRouteVerbose,
  useMarket,
  FEE_MULTIPLIER,
} from "../context/Dex";
import { useTokenMap } from "../context/TokenList";
import { useMint, useOwnedTokenAccount } from "../context/Token";
import { useCanSwap, useReferral } from "../context/Swap";
// import TokenDialog from "./TokenDialog";
// import { SettingsButton } from "./Settings";
// import { InfoLabel } from "./Info";
import { SOL_MINT, WRAPPED_SOL_MINT } from "../utils/pubkeys";


interface MarketParsedTokenAccount extends NFTParsedTokenAccount {
  markets?: string[];
}

const useStyles = makeStyles((theme) => ({
  tokenSelectWrapper: {
    display: "flex",
    alignItems: "stretch",
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column",
    },
  },
  tokenSelectContainer: {
    flexBasis: "100%",    
    [theme.breakpoints.down("sm")]: {
      width: "100%",
    },
    padding: '10px',
    border: '1px solid grey',
    borderRadius: '10px'
  },
  selectArrowContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  tokenSelectArrow: {
    position: "relative",
    top: "12px",
    [theme.breakpoints.down("sm")]: { transform: "rotate(90deg)" },
  },
  transferField: {
    marginTop: theme.spacing(2),
  },
  amountContainer: {
    marginBottom:'20px'
  },
  icon: {
    height: 24,
    maxWidth: 24,
    marginRight: 20
  },
  nativeBalanceContainer: {
    display: 'flex',   
    margin: 15,
    justifyContent: 'center'    
  }
}));

function Source() {
  const nft = false;
  const classes = useStyles();
  const dispatch = useDispatch();
  const history = useHistory();
  const sourceChain = useSelector(selectTransferSourceChain);  
  const { provider, signerAddress } = useEthereumProvider();
  const targetChain = useSelector(selectTransferTargetChain);
  const targetAsset = useSelector(selectTransferTargetAsset);
  const { handleClick, handleNativeClick } =
    useHandleRedeem();
  const parsedTokenAccount = useSelector(
    selectTransferSourceParsedTokenAccount
  );
  const [useNativeRedeem, setUseNativeRedeem] = useState(true); 

  const hasParsedTokenAccount = !!parsedTokenAccount;
  const isSolanaMigration =
    sourceChain === CHAIN_ID_SOLANA &&
    !!parsedTokenAccount &&
    !!MIGRATION_ASSET_MAP.get(parsedTokenAccount.mintKey);
  const isEthereumMigration =
    sourceChain === CHAIN_ID_ETH &&
    !!parsedTokenAccount &&
    !!ETH_MIGRATION_ASSET_MAP.get(getAddress(parsedTokenAccount.mintKey));
  const isBscMigration =
    sourceChain === CHAIN_ID_BSC &&
    !!parsedTokenAccount &&
    !!BSC_MIGRATION_ASSET_MAP.get(getAddress(parsedTokenAccount.mintKey));
  const isMigrationAsset =
    isSolanaMigration || isEthereumMigration || isBscMigration;

  const isEthNative =
    targetChain === CHAIN_ID_ETH &&
    targetAsset &&
    targetAsset.toLowerCase() === WETH_ADDRESS.toLowerCase();
  const isEthRopstenNative =
    targetChain === CHAIN_ID_ETHEREUM_ROPSTEN &&
    targetAsset &&
    targetAsset.toLowerCase() === ROPSTEN_WETH_ADDRESS.toLowerCase();  
  const isSolNative =
    targetChain === CHAIN_ID_SOLANA &&
    targetAsset &&
    targetAsset === WSOL_ADDRESS;
  const isNativeEligible =
    isEthNative ||
    isEthRopstenNative ||   
    isSolNative;
  const uiAmountString = useSelector(selectTransferSourceBalanceString);
  const amount = useSelector(selectTransferAmount);
  const shouldLockFields = useSelector(selectTransferShouldLockFields);
  const { isReady, statusMessage } = useIsWalletReady(sourceChain);  
  const walletIsReady = useIsWalletReady(sourceChain);
  const isSendComplete = useSelector(selectTransferIsSendComplete);
  const setSourceParsedTokenAccount = nft
    ? setNFTSourceParsedTokenAccount
    : setTransferSourceParsedTokenAccount;
  const setSourceWalletAddress = nft
    ? setNFTSourceWalletAddress
    : setTransferSourceWalletAddress;
  const { data: marketsData } = useMarketsMap(true);
  const maps = useGetSourceParsedTokens(nft);
  const chainId = useSelector(
    nft ? selectNFTSourceChain : selectTransferSourceChain
  );
  const [targetSelectIndex, setTargetSelectIndex] = useState(0);
  const marketChainTokens = marketsData?.tokens?.[chainId];
  const featuredMarkets = marketsData?.tokenMarkets?.[chainId]?.[targetChain];        
  const sourceNativeBalance = useTransactionFees(sourceChain);  

  const solanaWallet:any = useSolanaWallet();

  // const SRM = new PublicKey('SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt');
  // const USDC = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGk');
  // const wormhole = new PublicKey('a9muu4qvisctjvpjdbjwkb28deg915lyjkrzq19ji3fm');
  // const WBTC = new PublicKey('9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E');
  // const DECIMALS = 6;

  // const {
  //   fromMint,
  //   toMint,
  //   fromAmount,
  //   slippage,
  //   isClosingNewAccounts,
  //   isStrict,
  // } = useSwapContext();
  const [fromMint, ] = useState(new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'));
  const [toMint, ] = useState(new PublicKey('A9mUU4qviSctJVPJdBJWkb28deg915LYJKrzQ19ji3FM'));
  const [fromAmount, ] = useState(1);
  const [slippage, ] = useState(0.5);
  const [isClosingNewAccounts, ] = useState(false);
  const [isStrict, ] = useState(false);

  // const { swapClient } = useDexContext();
  const fromMintInfo = useMint(fromMint);
  const toMintInfo = useMint(toMint);
  const openOrders = useOpenOrders();
  const route = useRouteVerbose(fromMint, toMint);
  const fromMarket = useMarket(
    route && route.markets ? route.markets[0] : undefined
  );
  const toMarket = useMarket(
    route && route.markets ? route.markets[1] : undefined
  );
  const canSwap = useCanSwap();
  const referral = useReferral(fromMarket);
  const fair = useSwapFair();
  let fromWallet = useOwnedTokenAccount(fromMint);
  let toWallet = useOwnedTokenAccount(toMint);
  const quoteMint = fromMarket && fromMarket.quoteMintAddress;
  const quoteMintInfo = useMint(quoteMint);
  const quoteWallet = useOwnedTokenAccount(quoteMint);


  async function make_swapClient(wallet:any) {
    const provider = new Provider(
      new Connection('https://api.mainnet-beta.solana.com', 'recent'),
      wallet,
      Provider.defaultOptions(),
    );
    const tokenList = await new TokenListProvider().resolve();
    return new Swap(provider, tokenList);
  }

  const swapNew = async () => {
console.log("click swap");
    const swapClient = await make_swapClient(solanaWallet);

console.log('fromMintinfo');
console.log(fromMintInfo);
    if (!fromMintInfo || !toMintInfo) {
      throw new Error("Unable to calculate mint decimals");
    }
console.log('fair');
console.log(fair);
    if (!fair) {
      throw new Error("Invalid fair");
    }
console.log('quoteMint');
console.log(quoteMint);
    if (!quoteMint || !quoteMintInfo) {
      throw new Error("Quote mint not found");
    }

    const amount = new BN(fromAmount * 10 ** fromMintInfo.decimals);
    const isSol = fromMint.equals(SOL_MINT) || toMint.equals(SOL_MINT);
    const wrappedSolAccount = isSol ? Keypair.generate() : undefined;

    // Build the swap.
    let txs = await (async () => {
      if (!fromMarket) {
        throw new Error("Market undefined");
      }

      const minExchangeRate = {
        rate: new BN((10 ** toMintInfo.decimals * FEE_MULTIPLIER) / fair)
          .muln(100 - slippage)
          .divn(100),
        fromDecimals: fromMintInfo.decimals,
        quoteDecimals: quoteMintInfo.decimals,
        strict: isStrict,
      };
      const fromOpenOrders = fromMarket
        ? openOrders.get(fromMarket?.address.toString())
        : undefined;
      const toOpenOrders = toMarket
        ? openOrders.get(toMarket?.address.toString())
        : undefined;
      const fromWalletAddr = fromMint.equals(SOL_MINT)
        ? wrappedSolAccount!.publicKey
        : fromWallet
        ? fromWallet.publicKey
        : undefined;
      const toWalletAddr = toMint.equals(SOL_MINT)
        ? wrappedSolAccount!.publicKey
        : toWallet
        ? toWallet.publicKey
        : undefined;

      return await swapClient.swapTxs({
        fromMint,
        toMint,
        quoteMint,
        amount,
        minExchangeRate,
        referral,
        fromMarket,
        toMarket,
        // Automatically created if undefined.
        fromOpenOrders: fromOpenOrders ? fromOpenOrders[0].address : undefined,
        toOpenOrders: toOpenOrders ? toOpenOrders[0].address : undefined,
        fromWallet: fromWalletAddr,
        toWallet: toWalletAddr,
        quoteWallet: quoteWallet ? quoteWallet.publicKey : undefined,
        // Auto close newly created open orders accounts.
        close: isClosingNewAccounts,
      });
    })();

    await swapClient.program.provider.sendAll(txs);
  }

  const featuredOptions = useMemo(() => {
    // only tokens have featured markets
    if (CLUSTER==="testnet" && !nft && maps?.tokenAccounts?.data){
      const ownedMarketTokens = maps?.tokenAccounts.data
      return [
        ...ownedMarketTokens]
    }
    if (!nft && featuredMarkets && maps?.tokenAccounts?.data) {       
      const ownedMarketTokens = maps?.tokenAccounts.data
        .filter(
          (option: NFTParsedTokenAccount) => featuredMarkets?.[option.mintKey]
        )
        .map(
          (option) =>
            ({
              ...option,
              markets: featuredMarkets[option.mintKey].markets,
            } as MarketParsedTokenAccount)
        ); 

      return [
        ...ownedMarketTokens,
        ...Object.keys(featuredMarkets)
          .filter(
            (mintKey) =>
              !ownedMarketTokens.find((option) => option.mintKey === mintKey) && Object.keys(MULTI_CHAIN_TOKENS[chainId]).find((address) => address === mintKey)
          )
          .map(
            (mintKey) =>
              ({
                amount: "0",
                decimals: 0,
                markets: featuredMarkets[mintKey].markets,
                mintKey,
                publicKey: "",
                uiAmount: 0,
                uiAmountString: "0", // if we can't look up by address, we can select the market that isn't in the list of holdings, but can't proceed since the balance will be 0
                symbol: marketChainTokens?.[mintKey]?.symbol,
                logo: marketChainTokens?.[mintKey]?.logo,
              } as MarketParsedTokenAccount)
          ),
      ];
    }
    return [];
  }, [nft, marketChainTokens, featuredMarkets, maps, chainId]);

  const getTokenInfo: (
    address: string,
    tokenId?: string
  ) => Promise<NFTParsedTokenAccount> = useCallback(
    async (address: string, tokenId?: string) => {
      if (provider && signerAddress && isReady) {
        try {
          const tokenAccount = await (nft
            ? getEthereumNFT(address, provider)
            : getEthereumToken(address, provider));
          if (!tokenAccount) {
            return Promise.reject("Could not find the specified token.");
          }
          if (nft && !tokenId) {
            return Promise.reject("Token ID is required.");
          } else if (nft && tokenId) {
            return ethNFTToNFTParsedTokenAccount(
              tokenAccount as NFTImplementation,
              tokenId,
              signerAddress
            );
          } else {
            return ethTokenToParsedTokenAccount(
              tokenAccount as TokenImplementation,
              signerAddress
            );
          }
        } catch (e) {
          return Promise.reject("Unable to retrive the specific token.");
        }
      } else {
        return Promise.reject({ error: "Wallet is not connected." });
      }
    },
    [isReady, nft, provider, signerAddress]
  );

  const handleSelectOption = useCallback(
    async (index: number) => {       
      const option: NFTParsedTokenAccount=featuredOptions[index]
      let newOption = null;
      try {
        //Covalent balances tend to be stale, so we make an attempt to correct it at selection time.
        if (getTokenInfo && !option.isNativeAsset) {
          newOption = await getTokenInfo(option.mintKey, option.tokenId);          
          newOption = {
            ...option,
            ...newOption,
            // keep logo and uri from covalent / market list / etc (otherwise would be overwritten by undefined)
            logo: option.logo || newOption.logo,
            uri: option.uri || newOption.uri,
          } as NFTParsedTokenAccount;
        } else {
          newOption = option;
        }
        if (!newOption) {
          dispatch(setSourceParsedTokenAccount(undefined));
          dispatch(setSourceWalletAddress(undefined));
        } else if (newOption !== undefined && walletIsReady.walletAddress) {          
          dispatch(setSourceParsedTokenAccount(newOption));          
          dispatch(setSourceWalletAddress(walletIsReady.walletAddress));
        }
      } catch (e: any) {
        console.log(e);
        if (e.message?.includes("v1")) {          
        } else {          
        }
      }
    },
    [dispatch, getTokenInfo, featuredOptions, walletIsReady, setSourceParsedTokenAccount, setSourceWalletAddress]
  );
  
  useEffect(() => {
    if (CLUSTER === "mainnet"){
      dispatch(setSourceChain(CHAIN_ID_ETH));
      dispatch(setTargetChain(CHAIN_ID_SOLANA));
    } else if (CLUSTER==="testnet"){
      dispatch(setSourceChain(CHAIN_ID_ETHEREUM_ROPSTEN));
      dispatch(setTargetChain(CHAIN_ID_SOLANA));
    }
  }, [dispatch])
  
  useEffect(() => {
    if (isSendComplete){
      if (isNativeEligible && useNativeRedeem) handleNativeClick()
      else handleClick()
    }
  }, [isSendComplete, isNativeEligible, useNativeRedeem, handleNativeClick, handleClick])
  
  useEffect(() => {
    if (!(provider && signerAddress && isReady)){
      if (hasParsedTokenAccount){
        dispatch(setSourceParsedTokenAccount(undefined));
        dispatch(setSourceWalletAddress(undefined));
      }
    }
    if (provider && signerAddress && isReady && !hasParsedTokenAccount && featuredOptions) {       
      if (maps?.tokenAccounts?.data){                
        if (maps?.tokenAccounts?.data.length>0) handleSelectOption(targetSelectIndex)
      }      
    }
  },[dispatch, setSourceParsedTokenAccount, setSourceWalletAddress, isReady, provider, signerAddress, featuredOptions, handleSelectOption, hasParsedTokenAccount,targetSelectIndex, maps])

  const handleMigrationClick = useCallback(() => {
    if (sourceChain === CHAIN_ID_SOLANA) {
      history.push(
        `/migrate/Solana/${parsedTokenAccount?.mintKey}/${parsedTokenAccount?.publicKey}`
      );
    } else if (sourceChain === CHAIN_ID_ETH) {
      history.push(`/migrate/Ethereum/${parsedTokenAccount?.mintKey}`);
    } else if (sourceChain === CHAIN_ID_BSC) {
      history.push(`/migrate/BinanceSmartChain/${parsedTokenAccount?.mintKey}`);
    }
  }, [history, parsedTokenAccount, sourceChain]);
  const handleEthereumChange = useCallback(
    (event) => {
      setTargetSelectIndex(event?.target.value)         
      handleSelectOption(event.target.value)            
    },
    [handleSelectOption]
  );
  const handleTargetChange = useCallback(
    (event) => {
      dispatch(setTargetChain(event.target.value));
    },
    [dispatch]
  );
  const handleAmountChange = useCallback(
    (event) => {
      dispatch(setAmount(event.target.value));
    },
    [dispatch]
  );
  const handleMaxClick = useCallback(() => {
    if (uiAmountString) {
      dispatch(setAmount(uiAmountString));
    }
  }, [dispatch, uiAmountString]);
  const handleNextClick = useCallback(() => {
    dispatch(incrementStep());
  }, [dispatch]);
  
  return (
    <>     
      <StepDescription>
        <div style={{ display: "flex", alignItems: "center" }}>
          Select tokens to send through the Wormhole Bridge.
          <div style={{ flexGrow: 1 }} />
          <div>
            <Button
              component={Link}
              to="/token-origin-verifier"
              size="small"
              variant="outlined"
              endIcon={<VerifiedUser />}
            >
              Token Origin Verifier
            </Button>
          </div>
        </div>
      </StepDescription>
      <div className={classes.amountContainer}>
        {hasParsedTokenAccount ? (
          <NumberTextField
            variant="outlined"
            label="Amount"
            fullWidth
            className={classes.transferField}
            value={amount}
            onChange={handleAmountChange}
            disabled={shouldLockFields}
            onMaxClick={
              uiAmountString && !parsedTokenAccount.isNativeAsset
                ? handleMaxClick
                : undefined
            }
          />
        ) : null}
      </div>
      <div className={classes.tokenSelectWrapper}>
        <div className={classes.tokenSelectContainer}>
          <Typography variant="caption">Source</Typography>          
          <EthereumSelect
            select
            variant="outlined"
            fullWidth
            value={targetSelectIndex}
            onChange={handleEthereumChange}
            disabled={shouldLockFields}
            tokens={featuredOptions}
          />
          <KeyAndBalance chainId={sourceChain} />
          <div className={classes.nativeBalanceContainer}>
            <img src={CHAINS[3].logo} alt={"ETH"} className={classes.icon} />
            <div style={{fontSize:'15px'}}>{'ETH  Balance:'}{'   '}{sourceNativeBalance.balanceString}</div>
          </div>
          {isMigrationAsset ? (
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleMigrationClick}
            >
              Go to Migration Page
            </Button>
          ) : (
            <>
              <LowBalanceWarning chainId={sourceChain} />
              <SourceAssetWarning
                sourceChain={sourceChain}
                sourceAsset={parsedTokenAccount?.mintKey}
              />          
            </>
          )}
        </div>
        <div className={classes.selectArrowContainer}>
          <div className={classes.tokenSelectArrow}>
            <ChainSelectArrow
              onClick={() => {
                dispatch(setSourceChain(targetChain));
              }}
              disabled={true}
            />
          </div>
        </div>
        <div className={classes.tokenSelectContainer}>
          <Typography variant="caption">Target</Typography>
          <SolanaSelect
            variant="outlined"
            select
            fullWidth
            value={0}            
            onChange={handleTargetChange}
            disabled={shouldLockFields}            
            token={featuredOptions[targetSelectIndex]}
          />
          <Target />
        </div>
        <div onClick={ async () => {await swapNew()}}>
          <h1>Click Here</h1>
        </div>
      </div> 
      <Send />     
    </>
  );
}

export default Source;
