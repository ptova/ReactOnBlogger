import {useCallback, useEffect, useRef, useState} from 'react';

export function CollapsibleHeader({children}: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const lastScrollY = useRef(0);
    const ticking = useRef(false);
    const handleScroll = useCallback(() => {
        if (ticking.current) {
            return;
        }
        requestAnimationFrame(() => {
            const currentScrollY = window.scrollY;

            // Compress when scrolling down past 50px
            if (currentScrollY > 50 && currentScrollY > lastScrollY.current) {

                setIsCollapsed(true);
            }
            // Expand when scrolling up
            else if (currentScrollY < lastScrollY.current) {
                setIsCollapsed(false);
            }

            lastScrollY.current = currentScrollY;
            ticking.current = false;
        });
        ticking.current = true;
    }, [])
    useEffect(() => {
        window.removeEventListener('scroll', handleScroll)
        setTimeout(() => window.addEventListener('scroll', handleScroll, {passive: true}), 400)
    }, [handleScroll, isCollapsed]);
    useEffect(() => {
        window.addEventListener('scroll', handleScroll, {passive: true});
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);


    return (<div style={{
        position:   'sticky',
        top:        0,
        zIndex:     10,
        height:     50,
        transition: 'all 200ms ease-in-out'
    }}>
        <div style={{
            transition: 'all 200ms ease-in-out',
            overflow:   'hidden', ...(isCollapsed ? {
                height:        0,
                paddingTop:    0,
                paddingBottom: 0,
                opacity:       0
            } : {
                height: 'auto'
            })
        }}>
            {children}
        </div>
    </div>);
}