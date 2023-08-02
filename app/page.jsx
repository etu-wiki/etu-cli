import { useState } from 'react';
import AppBar from '@mui/material/AppBar/index.js';
import Button from '@mui/material/Button/index.js';
import Switch from '@mui/material/Switch/index.js';
import Card from '@mui/material/Card/index.js';
import CardActions from '@mui/material/CardActions/index.js';
import CardContent from '@mui/material/CardContent/index.js';
import CardMedia from '@mui/material/CardMedia/index.js';
import CssBaseline from '@mui/material/CssBaseline/index.js';
import Grid from '@mui/material/Grid/index.js';
import Stack from '@mui/material/Stack/index.js';
import Box from '@mui/material/Box/index.js';
import Toolbar from '@mui/material/Toolbar/index.js';
import Typography from '@mui/material/Typography/index.js';
import Container from '@mui/material/Container/index.js';
import Link from '@mui/material/Link/index.js';
import FormControlLabel from '@mui/material/FormControlLabel/index.js';
import ThemeProvider from '@mui/material/styles/ThemeProvider.js';
import createTheme from '@mui/material/styles/createTheme.js';
import styled from '@mui/material/styles/styled.js';

// import { Link as Link2 } from "react-router-dom";

import etu from './etu.json';

import {
  THUMB_WIDTH_THRESHOLD,
  THUMB_HEIGHT_THRESHOLD,
  IMAGE_API_ENDPOINT,
} from "./config.js";

function Copyright() {
  return (
    <Typography variant="body2" color="text.secondary" align="center">
      {'Copyright © ETU '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

// TODO remove, this demo shouldn't need to reset the theme.
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const lightTheme = createTheme({
  palette: {
    mode: 'light',
  },
});

const MaterialUISwitch = styled(Switch)(({ theme }) => ({
  width: 62,
  height: 34,
  padding: 7,
  '& .MuiSwitch-switchBase': {
    margin: 1,
    padding: 0,
    transform: 'translateX(6px)',
    '&.Mui-checked': {
      color: '#fff',
      transform: 'translateX(22px)',
      '& .MuiSwitch-thumb:before': {
        backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
          '#fff',
        )}" d="M4.2 2.5l-.7 1.8-1.8.7 1.8.7.7 1.8.6-1.8L6.7 5l-1.9-.7-.6-1.8zm15 8.3a6.7 6.7 0 11-6.6-6.6 5.8 5.8 0 006.6 6.6z"/></svg>')`,
      },
      '& + .MuiSwitch-track': {
        opacity: 1,
        backgroundColor: theme.palette.mode === 'dark' ? '#8796A5' : '#aab4be',
      },
    },
  },
  '& .MuiSwitch-thumb': {
    backgroundColor: theme.palette.mode === 'dark' ? '#003892' : '#001e3c',
    width: 32,
    height: 32,
    '&:before': {
      content: "''",
      position: 'absolute',
      width: '100%',
      height: '100%',
      left: 0,
      top: 0,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
        '#fff',
      )}" d="M9.305 1.667V3.75h1.389V1.667h-1.39zm-4.707 1.95l-.982.982L5.09 6.072l.982-.982-1.473-1.473zm10.802 0L13.927 5.09l.982.982 1.473-1.473-.982-.982zM10 5.139a4.872 4.872 0 00-4.862 4.86A4.872 4.872 0 0010 14.862 4.872 4.872 0 0014.86 10 4.872 4.872 0 0010 5.139zm0 1.389A3.462 3.462 0 0113.471 10a3.462 3.462 0 01-3.473 3.472A3.462 3.462 0 016.527 10 3.462 3.462 0 0110 6.528zM1.665 9.305v1.39h2.083v-1.39H1.666zm14.583 0v1.39h2.084v-1.39h-2.084zM5.09 13.928L3.616 15.4l.982.982 1.473-1.473-.982-.982zm9.82 0l-.982.982 1.473 1.473.982-.982-1.473-1.473zM9.305 16.25v2.083h1.389V16.25h-1.39z"/></svg>')`,
    },
  },
  '& .MuiSwitch-track': {
    opacity: 1,
    backgroundColor: theme.palette.mode === 'dark' ? '#8796A5' : '#aab4be',
    borderRadius: 20 / 2,
  },
}));

export default function Page() {
  const [dark, setDark] = useState(true);

  const handleThemeChange = () => {
    setDark(!dark);
  };
  const logoStyles = {
    margin: '10px'
  };

  return (
    <ThemeProvider theme={dark ? darkTheme : lightTheme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="relative">
          <Toolbar>
            <img src="etu-logo.png" alt="ETU Logo" height={30} width={30} style={logoStyles}></img>
            <Typography variant="h6" color="inherit" noWrap sx={{ flexGrow: 1 }}>
              ETU Gallary - IIIF v{etu.iiifVersion}
            </Typography>
            <FormControlLabel
              control={<MaterialUISwitch sx={{ m: 1 }} defaultChecked />}
              label=""
              onChange={handleThemeChange}
            />
          </Toolbar>
        </AppBar>
      </Box>
      <main>
        {/* Hero unit */}
        <Box
          sx={{
            bgcolor: 'background.paper',
            pt: 6,
            pb: 6,
          }}
        >
          <Container maxWidth="sm">
            <Typography
              component="h2"
              variant="h3"
              align="center"
              color="text.primary"
              gutterBottom
            >
              {etu.name}
            </Typography>
            <Typography variant="h6" align="center" color="text.secondary" paragraph>
              {etu.author ? 'author: ' + etu.author + " " : " "} {etu.license ? 'license: ' + etu.license + " " : " "}
            </Typography>
            <Stack
              sx={{ pt: 2 }}
              direction="row"
              spacing={2}
              justifyContent="center"
            >
              {etu.iiifVersion === '3' ? (
                <Button variant="contained" onClick={() => window.location = '/m3.html'}>All in Mirador 3</Button>
              ) : (
                <Button variant="contained" onClick={() => window.location = '/m2.html'}>All in Mirador 2</Button>
              )}
            </Stack>
          </Container>
        </Box>
        <Container sx={{ py: 0 }} maxWidth="md">
          {/* End hero unit */}
          <Grid container spacing={4}>
            {etu.images.map((present) => (
              <Grid item key={present.presentUuid} xs={12} sm={6} md={4}>
                <Card
                  sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                >
                  <CardMedia
                    component="div"
                    sx={{
                      // 16:9
                      pt: '56.25%',
                    }}
                    image={etu.isRemote ? `${IMAGE_API_ENDPOINT}/${present.files[0].image_id}/full/!${THUMB_WIDTH_THRESHOLD},${THUMB_HEIGHT_THRESHOLD}/0/default.${etu.format}` : 'i/' + present.files[0].image_id + `/thumbnail.${etu.format}`}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h5" component="h2">
                      {present.label}
                    </Typography>
                  </CardContent>
                  {etu.iiifVersion === '3' ? (
                    <CardActions>
                      <Link href={`u4-${present.presentUuid}.html`}>Universal 4</Link>
                      <Link href={`m3-${present.presentUuid}.html`}>Mirador 3</Link>
                      {/* <Link href={`http://localhost/index.html?manifest=http://localhost/p/3/${present.presentUuid}`}>Mirador 3-ocr</Link> */}
                      {/* <Link2 href={`#clover/${present.presentUuid}`}>Clover</Link2> */}
                    </CardActions>
                  ) : (
                    <CardActions>
                      <Link href={`u3-${present.presentUuid}.html`}>Universal 3</Link>
                      <Link href={`m2-${present.presentUuid}.html`}>Mirador 2</Link>
                      {/* <Link2 href={`#clover/${present.presentUuid}`}>Clover</Link2> */}
                    </CardActions>
                  )}
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </main>

      {/* Footer */}
      <Box sx={{ bgcolor: 'background.paper', p: 6 }} component="footer">
        <Copyright />
      </Box>
    </ThemeProvider>
  );
}
