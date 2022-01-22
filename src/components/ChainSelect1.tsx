import {
  ListItemIcon,
  ListItemText,
  makeStyles,
  MenuItem,
  OutlinedTextFieldProps,
} from "@material-ui/core";
import { ChainInfo } from "../utils/consts";

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
}));

const createChainMenuItem = ({ id, name, logo }: ChainInfo, classes: any) => (
  <MenuItem key={id} value={id}>
    <ListItemIcon className={classes.listItemIcon}>
      <img src={logo} alt={name} className={classes.icon} />
    </ListItemIcon>
    <ListItemText>{name}</ListItemText>
  </MenuItem>
);

interface ChainSelectProps extends OutlinedTextFieldProps {
  chain: ChainInfo | undefined;
}

export default function ChainSelect1({ chain, ...rest }: ChainSelectProps) {
  const classes = useStyles();
  return (
    <div style={{margin:"10px", border:"2px solid white", borderRadius:"10px"}}>
      {chain?createChainMenuItem(chain, classes):(<></>)}
    </div>
  );
}
