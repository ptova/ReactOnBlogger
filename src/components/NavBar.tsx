import {Link} from "react-router-dom";

const linkStyle = {
    textDecoration: 'none',
    padding:        '0.5rem 0.75rem',
    borderRadius:   '0.5rem',
    transition:     'background-color 0.2s'
};

export function NavBar() {
    return (<nav style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter:  'blur(10px)',
        borderRadius:    '0.75rem',
        padding:         '0.75rem 1.5rem',
        marginBottom:    '2rem',
        display:         'flex',
        justifyContent:  'space-between',
        alignItems:      'center',
        flexWrap:        'wrap',
        gap:             '1rem',
        color:           'white',
        fontWeight:      'bold',
    }}
    >
        <Link to="/" style={{
            fontSize:       '1.5rem',
            textDecoration: 'none',
            transition:     'opacity 0.2s',
            color:          'white'
        }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
            REACT On Blogger
        </Link>

        <div style={{
            display:    'flex',
            gap:        '1.5rem',
            alignItems: 'center'
        }}>
            <Link to="/" style={{...linkStyle, color: 'white'}}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                Home
            </Link>
            <Link to="/source/external" style={{...linkStyle, color: 'white'}}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                Follow
            </Link>
        </div>
    </nav>);
}