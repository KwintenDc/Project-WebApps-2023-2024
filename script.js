var currentPage = 'home.html';
var db;

window.addEventListener('load', function()  {
    // General page loading code
    $('#content').load('pages/home.html');

    // function() is necessary! Not arrow function: 
    // https://www.freecodecamp.org/news/regular-vs-arrow-functions-javascript/#:~:text=Regular%20functions%20have%20their%20own,the%20arrow%20function%20was%20created. 
    // To use arrow function, use $(document).on('click', '.nav-link', () => {...});

    $('.nav-link').click(function() {   
        console.log('clicked');
        $('#content').attr('data-currentPage', $(this).attr('data-page'));
        console.log($(this).attr('data-page'));
        $('#content').load('pages/' + $(this).attr('data-page'));
        currentPage = document.getElementById('content').getAttribute('data-currentpage');
        pageChanged();
    });  
    $('#content').on('click', '.image-button', function() {
        $('#content').attr('data-currentPage', $(this).attr('data-page'));
        console.log($(this).attr('data-page'));
        $('#content').load('pages/' + $(this).attr('data-page'));
        currentPage = document.getElementById('content').getAttribute('data-currentpage');
        pageChanged();
    });

    // Handle form submission
    $('#content').on('submit', '#uploadForm', (event) => {
        event.preventDefault(); 

        var title = $('#title').val();
        var keywords = $('#keywords').val();
        var author = $('#author').val();
        var imageFile = $('#image')[0].files[0]; 

        // Convert image file to a blob
        var reader = new FileReader();
        reader.onload = (event) => {
            var imageBlob = event.target.result;

            var transaction = db.transaction(["books"], "readwrite");
            var objectStore = transaction.objectStore("books");

            var newBook = {
                title: title,
                keywords: keywords,
                author: author,
                image: imageBlob
            };

            var addRequest = objectStore.add(newBook);

            addRequest.onsuccess = () => {
                console.log("[INFO] Book added to database successfully.");
            };

            addRequest.onerror = () => {
                console.error("Error adding book to database: " + addRequest.error);
            };
        };

        reader.readAsDataURL(imageFile); 
    });

    // Handle search form submission
    $('#content').on('click', '#searchButton', () => {
        var searchTerm = $('#searchInput').val();
        searchBooks(searchTerm); 
    });

    // Handle edit button click
    $('#content').on('click', '.edit-btn', function(){ // Use function() instead of () => {} to get the correct 'this' context
        var card = $(this).closest('.card'); 
        
        var title = card.find('.card-title').text(); 
        var author = card.find('.card-text:eq(0)').text().split(': ')[1]; 
        var keywords = card.find('.card-text:eq(1)').text().split(': ')[1]; 
        var imageSrc = card.find('.card-img').attr('src'); 
        
        card.html(
            '<div class="row no-gutters">' +
            '<div class="col-md-4 position-relative">' +
                '<img src="' + imageSrc + '" class="card-img" alt="Book Image">' +
                '<button type="button" class="btn btn-primary edit-image-btn">' +
                '<i class="fas fa-edit"></i>' +
                '</button>' +
            '</div>' +
            '<div class="col-md-8">' +
                '<div class="card-body">' +
                '<h5 class="card-title"><input type="text" class="form-control title-input" value="' + title + '"></h5>' +
                '<p class="card-text">Author: <input type="text" class="form-control author-input" value="' + author + '"></p>' +
                '<p class="card-text">Keywords: <input type="text" class="form-control keywords-input" value="' + keywords + '"></p>' +
                '<button type="button" class="btn btn-primary save-btn">Save</button>' +
                '</div>' +
            '</div>' +
            '</div>'
        );
  
        // Handle edit image button click
        card.find('.edit-image-btn').click(() => {
            var input = document.createElement('input');    // Open file picker dialog
            input.type = 'file';
            input.accept = 'image/*';
            input.click();

            input.onchange = () => {
                var imageFile = input.files[0];
                var reader = new FileReader();
                reader.onload = (event) => {
                    var imageBlob = event.target.result;
                    card.find('.card-img').attr('src', imageBlob);
                };
                reader.readAsDataURL(imageFile);
            };
        });  

        // Handle save button click
        card.find('.save-btn').click(() => {
            var newTitle = card.find('.title-input').val();
            var newAuthor = card.find('.author-input').val();
            var newKeywords = card.find('.keywords-input').val();
            var newImage = card.find('.card-img').attr('src');

            var transaction = db.transaction(["books"], "readwrite");
            var objectStore = transaction.objectStore("books");

            var request = objectStore.openCursor();

            request.onsuccess = (event) => {
                var cursor = event.target.result;
                if (cursor) {
                    var book = cursor.value;
                    if (book.title === title) {

                        book.title = newTitle;
                        book.author = newAuthor;
                        book.keywords = newKeywords;
                        book.image = newImage; 
                        
                        var updateRequest = cursor.update(book);

                        updateRequest.onsuccess = (event) => {

                            card.html('<div class="card mb-3">' +
                            '<div class="row no-gutters">' +
                                '<div class="col-md-4">' +
                                    '<img src="' + book.image + '" class="card-img" alt="Book Image">' +
                                '</div>' +
                                '<div class="col-md-8">' +
                                    '<div class="card-body">' +
                                        '<h5 class="card-title">' + book.title + '</h5>' +
                                        '<p class="card-text">Author: ' + book.author + '</p>' +
                                        '<p class="card-text">Keywords: ' + book.keywords + '</p>' +
                                        '<button type="button" class="btn btn-primary edit-btn">' +
                                            '<i class="fas fa-edit"></i> Edit' + 
                                        '</button>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>');
                        };

                        updateRequest.onerror = (event) => {
                            console.error("Error updating book: " + updateRequest.error);
                        };
                    } else {
                        cursor.continue();
                    }
                }
            };
        });
    });
    $('#content').on('click', '.start-scan', (event) => {
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.querySelector('#qrScanner'), 
                constraints: {
                    width: 640,
                    height: 480,
                    facingMode: "environment" 
                },
            },
            decoder: {
                readers: ["ean_reader"]
            }
        }, (err) => {
            if (err) {
                console.error("Failed to initialize Quagga:", err);
                return;
            }
            Quagga.start();
            Quagga.onDetected((result) => {
                var isbn = result.codeResult.code;
                fetchBookDetails(isbn);
                Quagga.stop();
            });
        });
    });
});

function pageChanged() {
    if(currentPage == 'home.html') {
        console.log('home');
    } else if(currentPage == 'view_books.html'){
        console.log('view_books');
        var request = indexedDB.open("bookDB", 1);

        request.onerror = (event) => {
            console.log('error: ' + event.target.errorCode);
        };
        request.onsuccess = (event) => {
            db = request.result;
            console.log('success: ' + db);

            displayAllBooks();
        };



    } else if(currentPage == 'store_books.html'){
        if (!window.indexedDB) {
            console.log("Your browser doesn't support a stable version of IndexedDB.");
        } else {
            var request = window.indexedDB.open("bookDB", 1);
        
            request.onerror = (event) => {
                console.log('error: ' + event.target.errorCode);
            };
            request.onsuccess = () => {
                db = request.result;
                console.log('success: ' + db);
            };
            request.onupgradeneeded = (event) => {
                var db = event.target.result;
                
                // Create an object store (table) named 'books'
                var objectStore = db.createObjectStore("books", { autoIncrement : true });
                
                objectStore.transaction.oncomplete = (event) => {
                    console.log("[INFO] Object store 'books' created successfully.");
                };
            };
        }
    } else if(currentPage == 'qr_code.html'){
        
    }
}
function displayAllBooks() {
    var objectStore = db.transaction("books").objectStore("books");
    var bookList = $('#bookList');

    bookList.empty(); // Clear previous search results

    objectStore.openCursor().onsuccess = (event) => {
        var cursor = event.target.result;
        if (cursor) {
            var book = cursor.value;
            var card = $('<div class="card mb-3">' +
                '<div class="row no-gutters">' +
                    '<div class="col-md-4">' +
                        '<img src="' + book.image + '" class="card-img" alt="Book Image">' +
                    '</div>' +
                    '<div class="col-md-8">' +
                        '<div class="card-body">' +
                            '<h5 class="card-title">' + book.title + '</h5>' +
                            '<p class="card-text">Author: ' + book.author + '</p>' +
                            '<p class="card-text">Keywords: ' + book.keywords + '</p>' +
                            '<button type="button" class="btn btn-primary edit-btn">' +
                                '<i class="fas fa-edit"></i> Edit' + 
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>');

            bookList.append(card);
            cursor.continue();
        }
    };
}

function searchBooks(searchTerm) {
    var objectStore = db.transaction("books").objectStore("books");
    var bookList = $('#bookList');

    bookList.empty(); 

    objectStore.openCursor().onsuccess = (event) => {
        var cursor = event.target.result;
        if (cursor) {
            var book = cursor.value;
            if (book.title.includes(searchTerm) || book.author.includes(searchTerm) || book.keywords.includes(searchTerm)) {
                var card = $('<div class="card mb-3">' +
                '<div class="row no-gutters">' +
                    '<div class="col-md-4">' +
                        '<img src="' + book.image + '" class="card-img" alt="Book Image">' +
                    '</div>' +
                    '<div class="col-md-8">' +
                        '<div class="card-body">' +
                            '<h5 class="card-title">' + book.title + '</h5>' +
                            '<p class="card-text">Author: ' + book.author + '</p>' +
                            '<p class="card-text">Keywords: ' + book.keywords + '</p>' +
                            '<button type="button" class="btn btn-primary edit-btn">' +
                                '<i class="fas fa-edit"></i> Edit' + // Edit icon from Font Awesome
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>');

                bookList.append(card);
            }
            cursor.continue();
        }
    };
}
// Function to fetch book details using ISBN
function fetchBookDetails(isbn) {
    var url = 'https://openlibrary.org/isbn/'+isbn+'.json';
    fetch(url)
        .then(response => response.json())
        .then(data => {
            var bookDetails = document.getElementById('bookDetails');
            var qrScanner = document.getElementById('qrScanner');
            qrScanner.innerHTML = ''; 
            var title = data.title ? '<h3>Title: ' + data.title + '</h3>' : '';
            var author = data.contributors ? '<p>Author: ' + data.contributors[0].name + '</p>' : '';
            var isbn = data.isbn_13 ? '<p>ISBN: ' + data.isbn_13[0] + '</p>' : '';
            var physicalFormat = data.physical_format ? '<p>Physical Format: ' + data.physical_format + '</p>' : '';

            var html = title + author + isbn + physicalFormat;

            bookDetails.innerHTML = html;
            console.log('Book details:', data);
        })
        .catch(error => {
            console.error('Error fetching book details:', error);
            alert('Error fetching book details');
        });
}
