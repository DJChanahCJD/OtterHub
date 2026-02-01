import { Hono } from 'hono';
import { bingRoutes } from './wallpaper/bing';
import { picsumRoutes } from './wallpaper/picsum';
import { pixabayRoutes } from './wallpaper/pixabay';
import { unsplashRoutes } from './wallpaper/unsplash';
import { wallhavenRoutes } from './wallpaper/wallhaven';
import { wallpaperProxyRoutes } from './wallpaper/proxy';
import type { Env } from '../types/hono';

export const wallpaperRoutes = new Hono<{ Bindings: Env }>();

wallpaperRoutes.route('/', bingRoutes);
wallpaperRoutes.route('/', picsumRoutes);
wallpaperRoutes.route('/', pixabayRoutes);
wallpaperRoutes.route('/', unsplashRoutes);
wallpaperRoutes.route('/', wallhavenRoutes);
wallpaperRoutes.route('/', wallpaperProxyRoutes);
