import {
  CHAIN_ID_ETH,
  CHAIN_ID_SOLANA,
  CHAIN_ID_BSC,
  CHAIN_ID_ETHEREUM_ROPSTEN,
  NFTImplementation,
  TokenImplementation,
  WSOL_ADDRESS
} from "@certusone/wormhole-sdk";
import  doSwap  from '../../swap/doSwap'
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
import { useSolanaWallet } from "../../contexts/SolanaWalletContext";

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

  const wallet=useSolanaWallet()
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
        console.log(ownedMarketTokens)
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
  const handleSwapClick = async () => {     
    
    await doSwap(wallet);    
  }
  
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
      </div> 
      <Send />     
      <button name="button" onClick={handleSwapClick}>swap!</button>
    </>
  );
}

export default Source;
