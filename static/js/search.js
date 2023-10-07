var fuse;
var searchResults = document.getElementById("searchResults");
var searchInput = document.getElementById("searchInput");

if (searchInput) {
    searchInput.onkeyup = function(e) {
        if (!fuse) {
            fetch('/index.json')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    fuse = new Fuse(data.data, {
                        keys: ['title', 'content'],
                        threshold: 0.3
                    });
                    performSearch(this.value);
                })
                .catch(error => {
                    console.log('There was a problem with the fetch operation:', error.message);
                });
        } else {
            performSearch(this.value);
        }
    };
}

function performSearch(term) {
    if (searchResults) {
        searchResults.innerHTML = "";
        const results = fuse.search(term);
        results.forEach(result => {
            var item = document.createElement("li");
            var link = document.createElement("a");
            link.href = result.item.permalink;
            link.innerText = result.item.title;
            item.appendChild(link);
            searchResults.appendChild(item);
        });
    }
}