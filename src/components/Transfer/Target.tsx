import {
  CHAIN_ID_SOLANA,
  CHAIN_ID_ETH,  
  hexToNativeString,
} from "@certusone/wormhole-sdk";
import { makeStyles } from "@material-ui/core";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import useGetTargetParsedTokenAccounts from "../../hooks/useGetTargetParsedTokenAccounts";
import useSyncTargetAddress from "../../hooks/useSyncTargetAddress";
import { CHAINS, CLUSTER } from "../../utils/consts";
import {
  selectTransferShouldLockFields,  
  selectTransferTargetAddressHex,
  selectTransferTargetAsset,  
  selectTransferTargetChain,
  selectTransferTargetParsedTokenAccount,
} from "../../store/selectors";
import KeyAndBalance from "../KeyAndBalance";
import LowBalanceWarning from "../LowBalanceWarning";
import SolanaCreateAssociatedAddress, {
  useAssociatedAccountExistsState,
} from "../SolanaCreateAssociatedAddress";
import useTransactionFees from "../../hooks/useTransactionFees";

export const useTargetInfo = () => {
  const targetChain = useSelector(selectTransferTargetChain);
  const targetAddressHex = useSelector(selectTransferTargetAddressHex);
  const targetAsset = useSelector(selectTransferTargetAsset);  
  const targetParsedTokenAccount = useSelector(
    selectTransferTargetParsedTokenAccount
  );
  const tokenName = targetParsedTokenAccount?.name;
  const symbol = targetParsedTokenAccount?.symbol;
  const logo = targetParsedTokenAccount?.logo;
  const readableTargetAddress =
    hexToNativeString(targetAddressHex, targetChain) || "";
  return useMemo(
    () => ({
      targetChain,
      targetAsset,
      tokenName,
      symbol,
      logo,
      readableTargetAddress,
    }),
    [targetChain, targetAsset, tokenName, symbol, logo, readableTargetAddress]
  );
};

const useStyles = makeStyles((theme) => ({  
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

function Target() {
  const classes = useStyles();
  useGetTargetParsedTokenAccounts();    
  const targetNativeBalance = useTransactionFees(CHAIN_ID_SOLANA);
  const {
    targetChain,
    targetAsset,
    readableTargetAddress,
  } = useTargetInfo();
  const shouldLockFields = useSelector(selectTransferShouldLockFields);  
  const { associatedAccountExists, setAssociatedAccountExists } =
    useAssociatedAccountExistsState(
      targetChain,
      targetAsset,
      readableTargetAddress
    );
  useSyncTargetAddress(!shouldLockFields);
  return (
    <>     
      <KeyAndBalance chainId={targetChain} />    
      <div className={classes.nativeBalanceContainer}>
        <img src={CLUSTER==="mainnet"?CHAINS[5].logo:CHAINS[6].logo} alt={"SOL"} className={classes.icon} />
        <div style={{fontSize:'15px'}}>{'SOL  Balance:'}{'   '}{targetNativeBalance.balanceString}</div>
      </div> 
      {targetChain === CHAIN_ID_SOLANA && targetAsset ? (
        <SolanaCreateAssociatedAddress
          mintAddress={targetAsset}
          readableTargetAddress={readableTargetAddress}
          associatedAccountExists={associatedAccountExists}
          setAssociatedAccountExists={setAssociatedAccountExists}
        />
      ) : null}
      {/* <Alert severity="info" variant="outlined" className={classes.alert}>
        <Typography>
          You will have to pay transaction fees on{" "}
          {CHAINS_BY_ID[targetChain].name} to redeem your tokens.
        </Typography>
        {(isEVMChain(targetChain) || targetChain === CHAIN_ID_TERRA) && (
          <GasEstimateSummary methodType="transfer" chainId={targetChain} />
        )}
      </Alert> */}
      <LowBalanceWarning chainId={targetChain} />           
    </>
  );
}

export default Target;
