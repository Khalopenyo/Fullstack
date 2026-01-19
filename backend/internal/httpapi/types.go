package httpapi

type User struct {
	ID          string `json:"id"`
	Email       string `json:"email,omitempty"`
	DisplayName string `json:"displayName,omitempty"`
	IsAdmin     bool   `json:"isAdmin"`
	IsAnonymous bool   `json:"isAnonymous"`
	CreatedAt   string `json:"createdAt,omitempty"`
	UpdatedAt   string `json:"updatedAt,omitempty"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type Perfume struct {
	ID                  string   `json:"id"`
	CatalogMode         string   `json:"catalogMode"`
	Brand               string   `json:"brand"`
	Name                string   `json:"name"`
	Family              string   `json:"family"`
	Description         string   `json:"description"`
	Tags                []string `json:"tags"`
	NotesTop            []string `json:"notesTop"`
	NotesHeart          []string `json:"notesHeart"`
	NotesBase           []string `json:"notesBase"`
	Seasons             []string `json:"seasons"`
	DayNight            []string `json:"dayNight"`
	BasePrice           float64  `json:"basePrice"`
	BaseVolume          int      `json:"baseVolume"`
	Sillage             int      `json:"sillage"`
	Longevity           int      `json:"longevity"`
	ImageURL            string   `json:"image"`
	SearchNameRu        string   `json:"searchNameRu"`
	IsHit               bool     `json:"isHit"`
	OrderCount          int      `json:"orderCount"`
	InStock             bool     `json:"inStock"`
	Currency            string   `json:"currency"`
	Popularity          int      `json:"popularity"`
	PopularityMonth     int      `json:"popularityMonth"`
	PopularityMonthKey  string   `json:"popularityMonthKey"`
	ReviewAvg           float64  `json:"reviewAvg"`
	ReviewCount         int      `json:"reviewCount"`
	CreatedAt           string   `json:"createdAt,omitempty"`
	UpdatedAt           string   `json:"updatedAt,omitempty"`
}

type OrderItem struct {
	ID     string  `json:"id"`
	Volume float64 `json:"volume"`
	Mix    string  `json:"mix"`
	Qty    int     `json:"qty"`
	Price  float64 `json:"price"`
}

type Order struct {
	ID              string      `json:"id"`
	UserID          string      `json:"uid"`
	IsAnonymous     bool        `json:"isAnonymous"`
	Email           string      `json:"email"`
	DisplayName     string      `json:"displayName"`
	Items           []OrderItem `json:"items"`
	Total           float64     `json:"total"`
	Currency        string      `json:"currency"`
	Channel         string      `json:"channel"`
	DeliveryMethod  string      `json:"deliveryMethod"`
	DeliveryAddress string      `json:"deliveryAddress"`
	Fulfilled       bool        `json:"fulfilled"`
	CreatedAt       string      `json:"createdAt"`
}

type Review struct {
	ID          string `json:"id"`
	UID         string `json:"uid"`
	AuthorLabel string `json:"authorLabel"`
	Rating      int    `json:"rating"`
	Text        string `json:"text"`
	IsAnonymous bool   `json:"isAnonymous"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}
