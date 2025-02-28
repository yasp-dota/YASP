// Updates the heroes in the database
import axios from 'axios';
import db from '../store/db';
import { upsert } from '../util/insert';
import {
  SteamAPIUrls,
  getSteamAPIData,
  invokeIntervalAsync,
} from '../util/utility';

async function doHeroes() {
  const url = SteamAPIUrls.api_heroes({
    language: 'english',
  });
  const body = await getSteamAPIData({ url });
  if (!body || !body.result || !body.result.heroes) {
    return;
  }
  const heroResp = await axios.get(
    'https://raw.githubusercontent.com/odota/dotaconstants/master/build/heroes.json',
  );
  const heroData = heroResp.data;
  if (!heroData) {
    return;
  }
  for (let i = 0; i < body.result.heroes.length; i++) {
    const hero = body.result.heroes[i];
    const heroDataHero = heroData[hero.id] || {};
    await upsert(
      db,
      'heroes',
      {
        ...hero,
        primary_attr: heroDataHero.primary_attr,
        attack_type: heroDataHero.attack_type,
        roles: heroDataHero.roles,
        legs: heroDataHero.legs,
      },
      {
        id: hero.id,
      },
    );
  }
}
invokeIntervalAsync(doHeroes, 60 * 60 * 1000);
