import { Redirect, Route, Switch } from 'react-router-dom';

const redirect = (url) => {
  window.location.href = url;
};

// the /play prefix is used for generated sharing URLs, especially when we
// want to intercept incoming users and modify the standard experience
// i.e. for crew assignments, we send incoming users to a dedicated discord channel
//      for anything else, we just remove the "/play" and send to the unprefixed-url
const LandingPage = () => (
  <Switch>
    <Route
      path="/play/crew-assignment"
      render={() => redirect('https://discord.gg/nnVhHcdkmG')}
    />
    <Route
      render={({ location: { pathname, search } }) => (
        <Redirect to={`${pathname.replace(/^\/play/, '')}${search}`} />
      )}
    />
  </Switch>
);

export default LandingPage;
