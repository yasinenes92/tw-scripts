from pathlib import Path

def agac_yapisini_olustur(dizin, on_ek=""):
    yol = Path(dizin)
    
    # Sadece en tepedeki kök dizin için tam yolu (Absolute Path) yazdır
    if on_ek == "":
        print(yol.resolve())
        
    # Dizin içindeki içerikleri al
    icerikler = list(yol.iterdir())
    
    # Geçici dosyaları ve bu betiğin kendisini gizle
    gecerli_icerikler = [
        i for i in icerikler 
        if not i.name.startswith('~$') and i.name != "dosyalari_listele.py"
    ]
    
    # Önce klasörler, sonra dosyalar olacak şekilde alfabetik sırala
    gecerli_icerikler.sort(key=lambda x: (x.is_file(), x.name.lower()))
    
    icerik_sayisi = len(gecerli_icerikler)
    
    for indeks, oge in enumerate(gecerli_icerikler):
        son_oge_mi = (indeks == icerik_sayisi - 1)
        
        # Dal işaretçilerini belirle
        isaretci = "└── " if son_oge_mi else "├── "
        
        print(f"{on_ek}{isaretci}{oge.name}")
        
        # Eğer öğe bir klasörse, içine gir ve dallanmaya devam et
        if oge.is_dir():
            uzanti_on_ek = "    " if son_oge_mi else "│   "
            agac_yapisini_olustur(oge, on_ek + uzanti_on_ek)

if __name__ == "__main__":
    agac_yapisini_olustur(".")