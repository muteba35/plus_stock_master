import { NextResponse } from 'next/server';

export function middleware(request) {
  // Récupérer le token depuis les cookies
  const token = request.cookies.get('stockmaster_token')?.value;
  const { pathname } = request.nextUrl;

  // 1. Si l'utilisateur essaie d'aller sur le dashboard sans être connecté
  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Si l'utilisateur est déjà connecté et essaie d'aller sur les pages d'authentification
  if (
    (pathname === '/login' || 
     pathname === '/register' || 
     pathname === '/verify-email' || 
     pathname === '/verify-code') && 
    token
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Configurer les routes sur lesquelles le middleware doit s'exécuter
export const config = {
  // On ajoute '/verify-code' dans le matcher pour que le douanier surveille aussi cette page
  matcher: ['/dashboard/:path*', '/login', '/register', '/verify-email', '/verify-code'],
};