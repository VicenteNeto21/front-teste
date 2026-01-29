import React, { useState, useEffect } from 'react';
import { Archive, Hexagon, ChevronDown, ChevronRight, X } from 'lucide-react';
import '../assets/css/Sidebar.css';

const SidebarItem = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="sidebar-group">
            <div className="sidebar-header" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <Archive className="icon-apiary" size={18} />
                <span>{title}</span>
            </div>
            {isOpen && <div className="sidebar-content">{children}</div>}
        </div>
    );
};

const HiveItem = ({ name, onClick }) => (
    <div className="hive-item" onClick={onClick} style={{ cursor: 'pointer' }}>
        <Hexagon className="icon-hive" size={16} />
        <span>{name}</span>
    </div>
);

import { buscarApiarios, buscarColmeias } from '../services/apiarioService';

const Sidebar = ({ onHiveSelect }) => {
    const [apiaries, setApiaries] = useState([]);
    const [hives, setHives] = useState([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [apiariesData, hivesData] = await Promise.all([
                    buscarApiarios(),
                    buscarColmeias()
                ]);

                // Tratamento de dados para Apiários
                let safeApiaries = [];
                if (Array.isArray(apiariesData)) {
                    safeApiaries = apiariesData;
                } else if (apiariesData?.dados && Array.isArray(apiariesData.dados)) {
                    safeApiaries = apiariesData.dados;
                }

                // Tratamento de dados para Colmeias
                let safeHives = [];
                if (Array.isArray(hivesData)) {
                    safeHives = hivesData;
                } else if (hivesData?.dados && Array.isArray(hivesData.dados)) {
                    safeHives = hivesData.dados;
                } else if (Array.isArray(hivesData)) { // Caso buscarColmeias já retorne array achatado
                    safeHives = hivesData;
                }

                // Filtra apiários desativados
                const activeApiaries = safeApiaries.filter(ap => ap.atividade !== 0);

                setApiaries(activeApiaries);
                setHives(safeHives);
            } catch (error) {
                console.error("Erro ao carregar dados do Sidebar:", error);
            }
        };

        loadData();
    }, []);

    const handleHiveClick = (hive) => {
        // Tenta usar coordenadas da colmeia ou do apiário vinculado
        let lat = parseFloat(hive.lat || hive.latitude);
        let lng = parseFloat(hive.lng || hive.longitude);

        // Se a colmeia não tem coord, tenta achar o apiário
        if (isNaN(lat) || isNaN(lng)) {
            const apiary = apiaries.find(a => String(a.id) === String(hive.apiarioId || hive.apiario));
            if (apiary) {
                lat = parseFloat(apiary.coord_Y);
                lng = parseFloat(apiary.coord_X);
            }
        }

        if (onHiveSelect && !isNaN(lat) && !isNaN(lng)) {
            onHiveSelect(lat, lng);
        }
        setIsMobileMenuOpen(false); // Fecha o menu ao selecionar
    };

    // Agrupa colmeias por apiário (apenas ativas)
    const getHivesForApiary = (apiaryId) => {
        return hives.filter(hive => String(hive.apiarioId || hive.apiario) === String(apiaryId) && hive.status === 1);
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const renderSidebarContent = () => (
        <>
            {apiaries.length === 0 ? (
                <div className="sidebar-empty">Nenhum apiário cadastrado</div>
            ) : (
                apiaries.filter(a => getHivesForApiary(a.id).length > 0).map((apiario) => (
                    <SidebarItem key={apiario.id} title={apiario.nomeApelido || `Apiário ${apiario.id}`}>
                        {getHivesForApiary(apiario.id).map((hive, hiveIndex) => (
                            <HiveItem
                                key={hive.id}
                                name={`Colmeia ${hiveIndex + 1}`}
                                onClick={() => handleHiveClick(hive)}
                            />
                        ))}
                    </SidebarItem>
                ))
            )}
        </>
    );

    return (
        <>
            {/* Botão FAB mobile para apiários */}
            <button className="sidebar-fab" onClick={toggleMobileMenu}>
                <Hexagon size={24} />
            </button>

            {/* Overlay para fechar o menu */}
            {isMobileMenuOpen && (
                <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)} />
            )}

            {/* Sidebar Desktop */}
            <div className="sidebar-container sidebar-desktop">
                {renderSidebarContent()}
            </div>

            {/* Sidebar Mobile (dropdown) */}
            <div className={`sidebar-container sidebar-mobile ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="sidebar-mobile-header">
                    <span>Seus Apiários</span>
                    <button className="sidebar-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
                        <X size={20} />
                    </button>
                </div>
                {renderSidebarContent()}
            </div>
        </>
    );
};

export default Sidebar;