import React, { createContext, useEffect, useState } from "react";
import type { IUser } from "../assets 2/assets";


interface AuthContextProps {
    isLoggedIn: boolean;
    setIsLoggedIn: (loggedIn: boolean) => void;
    user: IUser | null;
    setUser: (user: IUser | null) => void;
    login: (user: {email: string, password: string}) => Promise<void>;
    signup: (user: {name: string, email: string, password: string}) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
    isLoggedIn: false,
    setIsLoggedIn: () => {},
    user: null,
    setUser: () => {},
    login: async () => {},
    signup: async () => {},
    logout: async () => {}
})

export const AuthProvider = ({children} : {children: React.ReactNode}) => {

    const [user, setUser] = useState<IUser | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

    const signup = async() => {

    }

    const login = async() => {
        
    }

    const logout = async() => {
        
    }

    const fetchUser = async() => {
        
    }

    useEffect(() => {
        (async () => {
            await fetchUser();
        })();
    },[])

    const value = {
        user, setUser,
        isLoggedIn, setIsLoggedIn,
        signup, login, logout
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}