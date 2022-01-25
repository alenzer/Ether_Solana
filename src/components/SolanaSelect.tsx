import {
  ListItemIcon,
  ListItemText,
  makeStyles,
  MenuItem,
  OutlinedTextFieldProps,
  TextField
} from "@material-ui/core";
import { NFTParsedTokenAccount } from "../store/nftSlice";

const useStyles = makeStyles((theme) => ({
  select: {
    "& .MuiSelect-root": {
      display: "flex",
      alignItems: "center",
    },
  },
  listItemIcon: {
    minWidth: 40,
  },
  icon: {
    height: 24,
    maxWidth: 24,
  },
  tokenContainer: {
    paddingTop: '12px',
    paddingBottom: '12px',
    border: '1px solid rgb(70,74,83)',
    borderRadius: '3px'
  }
}));

interface MarketParsedTokenAccount extends NFTParsedTokenAccount {
  markets?: string[];
}

const createChainMenuItem = ({ mintKey, symbol, logo }: MarketParsedTokenAccount, classes: any) => (
  <MenuItem key={mintKey} value={0}>
    <ListItemIcon className={classes.listItemIcon}>
      <img src={logo} alt={symbol} className={classes.icon} />
    </ListItemIcon>
    <ListItemText>{symbol}{' (Solana)'}</ListItemText>
  </MenuItem>
);

interface TokenSelectProps extends OutlinedTextFieldProps {  
  token: MarketParsedTokenAccount;
}

export default function SolanaSelect({token, ...rest }: TokenSelectProps) {
  const classes = useStyles();
  return (
    <div className={classes.tokenContainer}>
      {token?createChainMenuItem(token, classes):(<></>)}
    </div>
  );
}
